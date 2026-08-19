package com.insurance.portal.service;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiKnowledgeService {

    private static final String CURATED_RESOURCE = "ai/curated_manual_qa.csv";
    private static final String SECONDARY_RESOURCE = "ai/insurance_website_qa_50000.tsv";

    private final List<KnowledgeEntry> entries = new ArrayList<>(50_500);
    private final Map<String, int[]> tokenIndex = new ConcurrentHashMap<>();
    private volatile boolean ready = false;
    private volatile int curatedCount = 0;
    private volatile int secondaryCount = 0;

    private static final Set<String> STOP = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "the","and","for","with","what","why","how","does","this","that","from","into","about","please","explain","can","you","give","need","want","when","where","which","should",
            "customer","insurance","website","company","portal","detail","simple","terms",
            "အတွက်","အကြောင်း","ဘာလဲ","ဘယ်လို","ရှင်းပြ","ပြောပေးပါ","ဆိုတာ","ကို","က","ရဲ့","မှာ","တဲ့အခါ"
    )));

    @PostConstruct
    public void load() {
        entries.clear();
        tokenIndex.clear();
        curatedCount = loadCuratedCsv();
        secondaryCount = loadSecondaryTsv();
        buildIndex();
        ready = !entries.isEmpty();
        System.out.println("Local chatbot knowledge loaded: " + entries.size()
                + " records (curated=" + curatedCount + ", secondary=" + secondaryCount + "), "
                + tokenIndex.size() + " indexed terms");
    }

    private int loadCuratedCsv() {
        int count = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(CURATED_RESOURCE).getInputStream(), StandardCharsets.UTF_8), 1 << 16)) {
            String header = reader.readLine();
            if (header == null) return 0;
            String line;
            while ((line = reader.readLine()) != null) {
                List<String> p = parseCsv(line);
                if (p.size() < 9) continue;
                String id = stripBom(p.get(0));
                String domain = p.get(1);
                String category = p.get(2);
                String intent = p.get(3);
                String language = p.get(4);
                String question = p.get(5);
                String answer = p.get(6);
                String keywords = p.get(7);
                String route = p.get(8);
                int priority = 100;
                if (p.size() >= 10) {
                    try { priority = Integer.parseInt(p.get(9).trim()); } catch (Exception ignored) {}
                }
                entries.add(new KnowledgeEntry(id, domain, category, intent, language, question, answer, keywords, "curated", route, priority));
                count++;
            }
        } catch (Exception ex) {
            System.err.println("Curated CSV could not be loaded: " + ex.getMessage());
        }
        return count;
    }

    private int loadSecondaryTsv() {
        int count = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(SECONDARY_RESOURCE).getInputStream(), StandardCharsets.UTF_8), 1 << 20)) {
            String header = reader.readLine();
            if (header == null) return 0;
            String line;
            while ((line = reader.readLine()) != null) {
                String[] p = line.split("\\t", -1);
                if (p.length < 10) continue;
                entries.add(new KnowledgeEntry(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], "secondary", p[9], 20));
                count++;
            }
        } catch (Exception ex) {
            System.err.println("Secondary 50k knowledge could not be loaded: " + ex.getMessage());
        }
        return count;
    }

    private void buildIndex() {
        Map<String, List<Integer>> temp = new HashMap<>(16_000);
        for (int id = 0; id < entries.size(); id++) {
            KnowledgeEntry e = entries.get(id);
            Set<String> tokens = tokenize(e.question() + " " + e.keywords() + " " + e.category() + " " + e.intent());
            for (String token : tokens) {
                if (token.length() < 2 || STOP.contains(token)) continue;
                temp.computeIfAbsent(token, k -> new ArrayList<>()).add(id);
            }
        }
        for (Map.Entry<String, List<Integer>> x : temp.entrySet()) {
            List<Integer> list = x.getValue();
            if (list.size() > 20_000) continue;
            int[] arr = new int[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
            tokenIndex.put(x.getKey(), arr);
        }
    }

    public List<SearchHit> search(String query, int limit) {
        return search(query, limit, null, null);
    }

    public List<SearchHit> search(String query, int limit, String preferredDomain) {
        return search(query, limit, preferredDomain, null);
    }

    public List<SearchHit> search(String query, int limit, String preferredDomain, String preferredIntent) {
        if (!ready || query == null || query.isBlank()) return List.of();
        Set<String> q = tokenize(query);
        if (q.isEmpty()) return List.of();

        Map<Integer, Integer> overlap = new HashMap<>();
        for (String token : q) {
            int[] ids = tokenIndex.get(token);
            if (ids == null) continue;
            for (int id : ids) overlap.merge(id, 1, Integer::sum);
        }
        if (overlap.isEmpty()) return List.of();

        String normalizedQuery = normalizeForExact(query);
        String preferredLang = containsMyanmar(query) ? "my" : "en";
        PriorityQueue<SearchHit> heap = new PriorityQueue<>(Comparator.comparingDouble(SearchHit::score));
        int max = Math.max(1, Math.min(limit, 10));

        for (Map.Entry<Integer, Integer> c : overlap.entrySet()) {
            KnowledgeEntry e = entries.get(c.getKey());
            if (preferredDomain != null && !preferredDomain.isBlank() && !preferredDomain.equalsIgnoreCase(e.domain())) continue;
            if (preferredIntent != null && !preferredIntent.isBlank() && !preferredIntent.equalsIgnoreCase(e.intent())) continue;

            Set<String> et = tokenize(e.question() + " " + e.keywords() + " " + e.intent());
            int hit = c.getValue();
            double coverage = (double) hit / Math.max(1, q.size());
            double precision = (double) hit / Math.max(1, Math.min(et.size(), 20));
            double score = coverage * 0.68 + precision * 0.12;

            String normalizedEntry = normalizeForExact(e.question());
            if (normalizedQuery.equals(normalizedEntry)) score += 0.45;
            else if (normalizedEntry.contains(normalizedQuery) || normalizedQuery.contains(normalizedEntry)) score += 0.18;

            if (e.language().equals(preferredLang)) score += 0.07;
            if ("curated".equals(e.sourceType())) score += 0.22;
            score += Math.min(0.10, e.priority() / 1000.0);
            score = Math.min(1.0, score);

            SearchHit h = new SearchHit(e, score);
            if (heap.size() < max) heap.add(h);
            else if (score > Objects.requireNonNull(heap.peek()).score()) { heap.poll(); heap.add(h); }
        }

        List<SearchHit> out = new ArrayList<>(heap);
        out.sort(Comparator.comparingDouble(SearchHit::score).reversed());
        return out;
    }

    public int size() { return entries.size(); }
    public int curatedCount() { return curatedCount; }
    public int secondaryCount() { return secondaryCount; }
    public boolean isReady() { return ready; }
    public int indexedTerms() { return tokenIndex.size(); }

    private static String stripBom(String s) {
        return s != null && s.startsWith("\uFEFF") ? s.substring(1) : s;
    }

    private static List<String> parseCsv(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cell.append('"'); i++;
                } else quoted = !quoted;
            } else if (ch == ',' && !quoted) {
                out.add(cell.toString()); cell.setLength(0);
            } else cell.append(ch);
        }
        out.add(cell.toString());
        return out;
    }

    private static boolean containsMyanmar(String s) {
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= '\u1000' && c <= '\u109F') return true;
        }
        return false;
    }

    private static String normalizeForExact(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{M}\\p{N}]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static Set<String> tokenize(String value) {
        if (value == null || value.isBlank()) return Set.of();
        String raw = value.toLowerCase(Locale.ROOT);
        String normalized = raw.replaceAll("[^\\p{L}\\p{M}\\p{N}_/.-]+", " ").trim();
        Set<String> out = new LinkedHashSet<>();
        if (!normalized.isBlank()) {
            for (String t : normalized.split("\\s+")) if (t.length() >= 2 && !STOP.contains(t)) out.add(t);
        }

        addAlias(out, raw, "အသက်အာမခံ", "life", "life_insurance");
        addAlias(out, raw, "ကျန်းမာရေးအာမခံ", "health", "health_insurance");
        addAlias(out, raw, "ကားအာမခံ", "car", "motor", "vehicle", "vehicle_insurance");
        addAlias(out, raw, "မော်တော်ယာဉ်အာမခံ", "motor", "vehicle", "vehicle_insurance");
        addAlias(out, raw, "ပရီမီယံ", "premium");
        addAlias(out, raw, "လျော်ကြေး", "claim");
        addAlias(out, raw, "ကလိမ်း", "claim");
        addAlias(out, raw, "ကာကွယ်မှု", "coverage");
        addAlias(out, raw, "အကျိုးခံစားခွင့်ရသူ", "beneficiary");
        addAlias(out, raw, "သက်တမ်းတိုး", "renewal");
        addAlias(out, raw, "အကောင့်", "account", "register", "signup");
        addAlias(out, raw, "အကောင့်", "account", "register", "signup");
        addAlias(out, raw, "ဖွင့်", "register", "signup");
        addAlias(out, raw, "ဖွင့်", "register", "signup");
        addAlias(out, raw, "acc ", "account", "register");
        addAlias(out, raw, "password မေ့", "password", "forgot_password", "reset");
        addAlias(out, raw, "စကားဝှက်မေ့", "password", "forgot_password", "reset");
        addAlias(out, raw, "forgot password", "password", "forgot_password", "reset");
        addAlias(out, raw, "artificial intelligence", "artificial", "intelligence", "ai");
        addAlias(out, raw, "ဉာဏ်ရည်တု", "ai", "artificial", "intelligence");
        return out;
    }

    private static void addAlias(Set<String> out, String raw, String phrase, String... aliases) {
        if (raw.contains(phrase)) Collections.addAll(out, aliases);
    }

    public record KnowledgeEntry(String id, String domain, String category, String intent, String language,
                                 String question, String answer, String keywords, String sourceType, String route,
                                 int priority) {}
    public record SearchHit(KnowledgeEntry entry, double score) {}
}
