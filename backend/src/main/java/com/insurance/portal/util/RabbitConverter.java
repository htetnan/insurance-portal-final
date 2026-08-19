package com.insurance.portal.util;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rabbit Converter compatible Unicode-to-Zawgyi conversion for PDF output.
 * Source data remains Unicode; conversion is performed only at render time.
 */
public final class RabbitConverter {

    private static final String RULES_RESOURCE = "/rabbit/uni2zg.json";
    private static final Pattern ZAWGYI_ONLY = Pattern.compile("[\\u1060-\\u1097]");
    private static final Pattern JSON_RULE = Pattern.compile(
            "\\{\\s*\\\"from\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"\\s*,\\s*" +
                    "\\\"to\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"\\s*}"
    );
    private static final List<CompiledRule> RULES = loadRules();

    private RabbitConverter() {
    }

    public static String unicodeToZawgyi(String value) {
        if (value == null || value.isEmpty() || ZAWGYI_ONLY.matcher(value).find()) {
            return value;
        }
        String output = value;
        for (CompiledRule rule : RULES) {
            output = rule.pattern().matcher(output).replaceAll(rule.replacement());
        }
        return output;
    }

    private static List<CompiledRule> loadRules() {
        try (InputStream input = RabbitConverter.class.getResourceAsStream(RULES_RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Rabbit rules not found: " + RULES_RESOURCE);
            }
            String json = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            Matcher matcher = JSON_RULE.matcher(json);
            List<CompiledRule> rules = new ArrayList<>();
            while (matcher.find()) {
                String from = expandUnicodeEscapes(unescapeJson(matcher.group(1)));
                String to = expandUnicodeEscapes(unescapeJson(matcher.group(2)));
                rules.add(new CompiledRule(Pattern.compile(from), to));
            }
            if (rules.isEmpty()) {
                throw new IllegalStateException("Rabbit rules are empty: " + RULES_RESOURCE);
            }
            return List.copyOf(rules);
        } catch (IOException error) {
            throw new ExceptionInInitializerError(error);
        }
    }

    private static String unescapeJson(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            if (current != '\\' || i + 1 >= value.length()) {
                result.append(current);
                continue;
            }
            char escaped = value.charAt(++i);
            switch (escaped) {
                case '\\', '"', '/' -> result.append(escaped);
                case 'b' -> result.append('\b');
                case 'f' -> result.append('\f');
                case 'n' -> result.append('\n');
                case 'r' -> result.append('\r');
                case 't' -> result.append('\t');
                default -> {
                    result.append('\\');
                    result.append(escaped);
                }
            }
        }
        return result.toString();
    }

    private static String expandUnicodeEscapes(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            if (value.charAt(i) == '\\' && i + 5 < value.length() && value.charAt(i + 1) == 'u') {
                String hex = value.substring(i + 2, i + 6);
                try {
                    result.append((char) Integer.parseInt(hex, 16));
                    i += 5;
                    continue;
                } catch (NumberFormatException ignored) {
                    // Keep malformed/non-Unicode escapes unchanged.
                }
            }
            result.append(value.charAt(i));
        }
        return result.toString();
    }

    private record CompiledRule(Pattern pattern, String replacement) {
    }
}
