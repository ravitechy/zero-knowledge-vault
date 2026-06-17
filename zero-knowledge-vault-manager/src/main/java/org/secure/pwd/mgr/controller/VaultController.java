package org.secure.pwd.mgr.controller;

import org.secure.pwd.mgr.model.EncryptedVaultEnvelope;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/vaults")
@CrossOrigin(origins = "*", allowedHeaders = "*") // Allows Vite frontend to call this API
public class VaultController {
    private final ObjectMapper objectMapper;
    private final Path vaultDir;

    public VaultController(ObjectMapper objectMapper, @Value("${vault.dir}") String vaultDirPath) {
        this.objectMapper = objectMapper;
        this.vaultDir = Paths.get(vaultDirPath);
    }

    @PostConstruct
    public void ensureDirectoryExists() throws IOException {
        if (!Files.exists(vaultDir)) {
            Files.createDirectories(vaultDir);
        }
    }

    /**
     * Helper to safely map a vault ID to a file on disk.
     */
    private Path getVaultPath(String vaultId) {
        // STRICT SANITIZATION: Only allow alphanumeric characters, dashes, and underscores.
        if (!vaultId.matches("^[a-zA-Z0-9_-]+$")) {
            throw new IllegalArgumentException("Invalid Vault ID format.");
        }
        return vaultDir.resolve(vaultId + ".json");
    }

    /**
     * FETCH A VAULT
     * The backend just reads the JSON and sends it. It cannot decrypt it.
     */
    @GetMapping("/{vaultId}")
    public ResponseEntity<EncryptedVaultEnvelope> getVault(@PathVariable String vaultId) {
        try {
            Path vaultFile = getVaultPath(vaultId);

            if (!Files.exists(vaultFile)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            EncryptedVaultEnvelope envelope = objectMapper.readValue(vaultFile.toFile(), EncryptedVaultEnvelope.class);
            return ResponseEntity.ok(envelope);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * SAVE A VAULT
     * Accepts a brand new encrypted envelope from the browser and overwrites the file.
     */
    @PostMapping("/{vaultId}")
    public ResponseEntity<Void> saveVault(@PathVariable String vaultId, @RequestBody EncryptedVaultEnvelope envelope) {
        try {
            Path vaultFile = getVaultPath(vaultId);

            // Save the newly encrypted envelope to disk
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(vaultFile.toFile(), envelope);

            return ResponseEntity.ok().build();

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}