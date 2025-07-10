package com.example.demo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class AiMediatorController {

    @Autowired
    private AiMediatorService mediatorService;

    @PostMapping("/send-message")
    public ResponseEntity<Map<String, String>> handleMessage(@RequestBody Map<String, String> request) {
        String message = request.get("message");

        try {
            Map<String, String> response = mediatorService.processMessage(message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal error: " + e.getMessage()));
        }
    }
}
