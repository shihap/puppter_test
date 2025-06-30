package com.example.demo;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.Base64;

@Service
public class AiMediatorService {

    private final RestTemplate restTemplate = new RestTemplate();

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
