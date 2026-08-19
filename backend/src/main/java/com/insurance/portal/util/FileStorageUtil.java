package com.insurance.portal.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.*;

/**
 * Shared helper for saving customer-uploaded files (payment screenshots, claim documents,
 * application supporting documents) safely under the configured file-storage directory,
 * and for tracking multiple uploaded paths as a JSON array string in a TEXT column.
 */
public final class FileStorageUtil {

    private static final Map<String, String> IMAGE_EXT = Map.of(
            "image/jpeg", ".jpg",
            "image/png",  ".png",
            "image/webp", ".webp",
            "image/gif",  ".gif"
    );

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String STORAGE_ROOT =
            firstNonBlank(System.getProperty("app.upload.dir"),
                    System.getenv("FILE_STORAGE_DIR"),
                    "./uploads");

    private FileStorageUtil() {}

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "./uploads";
    }

    private static File storageRoot() throws IOException {
        File root = new File(STORAGE_ROOT).getCanonicalFile();
        if (!root.exists() && !root.mkdirs()) {
            throw new IOException("Unable to create file storage directory");
        }
        return root;
    }

    private static File resolveStoredFile(String storedPath) throws IOException {
        if (storedPath == null || storedPath.isBlank()) {
            throw new IOException("File path is empty");
        }
        File root = storageRoot();
        File candidate = new File(storedPath);
        // Existing records may contain absolute paths from the previous implementation.
        File file = candidate.isAbsolute()
                ? candidate.getCanonicalFile()
                : new File(root, storedPath).getCanonicalFile();
        if (!file.toPath().startsWith(root.toPath())) {
            throw new IOException("Invalid file path");
        }
        return file;
    }

    // ── Internal helper — shared path-traversal-safe write logic ─────────────
    private static String writeToDir(MultipartFile file, String ext, String subDir, String prefix) throws IOException {
        String safeFilename = prefix + "_" + UUID.randomUUID() + ext;
        File uploadRoot = new File(storageRoot(), subDir).getCanonicalFile();
        if (!uploadRoot.toPath().startsWith(storageRoot().toPath())) {
            throw new IOException("Invalid upload directory");
        }
        if (!uploadRoot.exists() && !uploadRoot.mkdirs()) {
            throw new IOException("Unable to create upload directory");
        }
        File dest = new File(uploadRoot, safeFilename).getCanonicalFile();
        if (!dest.getPath().startsWith(uploadRoot.getPath())) {
            throw new RuntimeException("Invalid upload path");
        }
        file.transferTo(dest);
        return storageRoot().toPath().relativize(dest.toPath()).toString();
    }

    /** Saves a file under uploads/{subDir}. Accepts images and PDFs. Returns null if the file is empty. */
    public static String saveDocument(MultipartFile file, String subDir, String prefix) throws IOException {
        if (file == null || file.isEmpty()) return null;
        String ct = file.getContentType();
        String ext;
        if (ct != null && IMAGE_EXT.containsKey(ct.toLowerCase())) {
            ext = IMAGE_EXT.get(ct.toLowerCase());
        } else if ("application/pdf".equalsIgnoreCase(ct)) {
            ext = ".pdf";
        } else {
            throw new RuntimeException("Unsupported file type. Only JPEG, PNG, WEBP, GIF, and PDF are allowed.");
        }
        return writeToDir(file, ext, subDir, prefix);
    }

    /** Saves an image file under uploads/{subDir}. Rejects PDFs and non-image types. Returns null if the file is empty. */
    public static String saveImage(MultipartFile file, String subDir, String prefix) throws IOException {
        if (file == null || file.isEmpty()) return null;
        String ct = file.getContentType();
        if (ct == null || !IMAGE_EXT.containsKey(ct.toLowerCase())) {
            throw new RuntimeException("Only JPEG, PNG, WEBP, and GIF images are allowed.");
        }
        return writeToDir(file, IMAGE_EXT.get(ct.toLowerCase()), subDir, prefix);
    }

    /** Saves multiple documents; skips empty files silently. */
    public static List<String> saveDocuments(List<MultipartFile> files, String subDir, String prefix) throws IOException {
        List<String> paths = new ArrayList<>();
        if (files == null) return paths;
        for (MultipartFile f : files) {
            String p = saveDocument(f, subDir, prefix);
            if (p != null) paths.add(p);
        }
        return paths;
    }

    /** Best-effort delete of a previously stored file (e.g. when replacing a profile picture). */
    public static void deleteFileQuietly(String path) {
        if (path == null || path.isBlank()) return;
        try { resolveStoredFile(path).delete(); } catch (Exception ignored) {}
    }

    /** Serialises a list of file paths to a JSON array string for storage in a TEXT column. */
    public static String toJsonArray(List<String> paths) {
        if (paths == null || paths.isEmpty()) return null;
        try { return MAPPER.writeValueAsString(paths); }
        catch (Exception e) { return null; }
    }

    /** Deserialises a JSON array string back into a list of file paths. */
    @SuppressWarnings("unchecked")
    public static List<String> fromJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return MAPPER.readValue(json, List.class); }
        catch (Exception e) { return List.of(); }
    }

    /** Returns the MIME content type for a file path based on its extension. */
    public static String contentTypeFor(String path) {
        if (path == null) return "application/octet-stream";
        String lower = path.toLowerCase();
        if (lower.endsWith(".png"))                    return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp"))                   return "image/webp";
        if (lower.endsWith(".gif"))                    return "image/gif";
        if (lower.endsWith(".pdf"))                    return "application/pdf";
        return "application/octet-stream";
    }

    /** Streams a file from disk as an HTTP response. Returns 404 if the file does not exist. */
    public static ResponseEntity<?> streamFile(String path) {
        try {
            File file = resolveStoredFile(path);
            if (!file.exists() || !file.isFile()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentTypeFor(path)))
                    .body(new FileSystemResource(file));
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Serves a single file whose path is stored inside a dynamic form-data JSON object.
     * formDataJson: JSON object where fieldId maps to a file path on disk.
     */
    @SuppressWarnings("unchecked")
    public static ResponseEntity<?> serveFormFile(String formDataJson, String fieldId) {
        if (formDataJson == null) return ResponseEntity.notFound().build();
        try {
            Map<String, Object> data = MAPPER.readValue(formDataJson, Map.class);
            Object val = data.get(fieldId);
            if (val == null) return ResponseEntity.notFound().build();
            return streamFile(val.toString());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
