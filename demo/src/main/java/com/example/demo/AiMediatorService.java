package com.example.demo;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class AiMediatorService {

    private final RestTemplate restTemplate = new RestTemplate();

    @PostConstruct
    public void init() {
        try {
            // قراءة محتوى ملف memory.txt
            ClassPathResource resource = new ClassPathResource("memory.txt");
            String message = new BufferedReader(new InputStreamReader(resource.getInputStream()))
                    .lines().collect(Collectors.joining(" "));

            // إرسال للـ LLM وعرض الرد
            String reply = sendToLLM(message);
            System.out.println("🧠 رد LLM: " + reply);

        } catch (Exception e) {
            System.err.println("❌ فشل في قراءة ملف memory.txt أو في الاتصال بـ LLM: " + e.getMessage());
        }
    }

    public Map<String, String> processMessage(String message) throws Exception {
        // 1. الرد المختصر
        String shortMessage = message + " . الرد المختصر";
        String shortReply = sendToLLM(shortMessage);

        // 2. إرسال للـ TTS بالتوازي
        CompletableFuture<String> audioFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return sendToTTS(shortReply);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        // 3. الرد الكامل
        String fullMessage = message + " . الرد الكامل";
        String fullReply = sendToLLM(fullMessage);

        // 4. استلام الصوت
        String audioBase64 = audioFuture.get();

        return Map.of(
                "text", fullReply,
                "audioBase64", audioBase64
        );
    }

    private String sendToLLM(String message) {
        String url = "http://localhost:8081/send-message";
        Map<String, String> body = Map.of("message", message);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);
        return response.getBody().get("response").toString();
    }

    private String sendToTTS(String message) {
        String url = "http://localhost:8082/send-message";
        Map<String, String> body = Map.of("message", message);
        ResponseEntity<byte[]> response = restTemplate.postForEntity(url, body, byte[].class);
        byte[] audioBytes = response.getBody();
        return Base64.getEncoder().encodeToString(audioBytes);
    }
}
