package com.insurance.portal.util;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.layout.element.Paragraph;

import java.io.IOException;
import java.io.InputStream;

/**
 * Loads the user's embedded Zawgyi-One font and converts Unicode Myanmar text
 * with Rabbit Converter at the PDF rendering boundary.
 */
public final class PdfFontUtil {

    private static final String FONT_RESOURCE = "/fonts/Zawgyi-One.ttf";

    private PdfFontUtil() {
    }

    public static PdfFont bilingualFont() throws IOException {
        try (InputStream input = PdfFontUtil.class.getResourceAsStream(FONT_RESOURCE)) {
            if (input == null) {
                throw new IOException("Bundled PDF font not found: " + FONT_RESOURCE);
            }
            return PdfFontFactory.createFont(
                    input.readAllBytes(),
                    PdfEncodings.IDENTITY_H,
                    PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED
            );
        }
    }

    public static Paragraph paragraph(String text) {
        return new Paragraph(RabbitConverter.unicodeToZawgyi(text));
    }
}
