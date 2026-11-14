package com.mrbiryani.chat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

/**
 * Claude adapter (Anthropic Messages API). Enabled only when ANTHROPIC_API_KEY is set. The key is
 * read from the server environment and never sent to clients.
 */
@Component
public class AnthropicLlmClient implements LlmClient {

    private static final URI ENDPOINT = URI.create("https://api.anthropic.com/v1/messages");

    private final String apiKey;
    private final String model;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public AnthropicLlmClient(@Value("${app.chat.llm.api-key:}") String apiKey,
            @Value("${app.chat.llm.model:claude-sonnet-5-5}") String model, ObjectMapper json) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.json = json;
    }

    @Override
    public boolean enabled() {
        return !apiKey.isEmpty();
    }

    @Override
    public String complete(String system, String user) {
        if (!enabled()) throw new IllegalStateException("LLM provider is not configured");
        String body = json.writeValueAsString(Map.of(
                "model", model,
                "max_tokens", 300,
                "system", system,
                "messages", List.of(Map.of("role", "user", "content", user))));
        HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                .timeout(Duration.ofSeconds(15))
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("LLM provider returned HTTP " + response.statusCode());
            }
            Map<?, ?> parsed = json.readValue(response.body(), Map.class);
            List<?> content = (List<?>) parsed.get("content");
            return content.stream()
                    .filter(c -> c instanceof Map<?, ?> m && "text".equals(m.get("type")))
                    .map(c -> String.valueOf(((Map<?, ?>) c).get("text")))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("LLM response had no text"));
        } catch (java.io.IOException e) {
            throw new IllegalStateException("LLM provider request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("LLM provider request interrupted", e);
        }
    }
}
