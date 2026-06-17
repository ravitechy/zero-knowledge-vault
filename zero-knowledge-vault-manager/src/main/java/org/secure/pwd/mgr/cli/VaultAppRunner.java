package org.secure.pwd.mgr.cli;

import org.secure.pwd.mgr.model.Credential;
import org.secure.pwd.mgr.model.VaultPayload;
import org.secure.pwd.mgr.service.VaultOrchestratorService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.Console;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Scanner;

@Component
@Profile("local")
public class VaultAppRunner implements CommandLineRunner {
    private final VaultOrchestratorService orchestrator;
    private final Path vaultDir;
    private Path vaultFile;

    public VaultAppRunner(VaultOrchestratorService orchestrator, @Value("${vault.dir}") String vaultDirPath) {
        this.orchestrator = orchestrator;
        this.vaultDir = Paths.get(vaultDirPath);
    }

    @Override
    public void run(String... args) throws Exception {
        Console console = System.console();
        if (console == null) {
            System.err.println("Error: Console not available. Please run this app from a terminal.");
            return;
        }

        if (!Files.exists(vaultDir)) {
            Files.createDirectories(vaultDir);
        }

        System.out.println("========================================");
        System.out.println("        LOCAL ZERO-KNOWLEDGE VAULT      ");
        System.out.println("========================================");

        String vaultFileName = args[0];
        this.vaultFile = vaultDir.resolve(vaultFileName);
        if (!Files.exists(vaultFile)) {
            handleFirstTimeSetup(console);
        }
        handleUnlockAndInteract(console);
    }

    private void handleFirstTimeSetup(Console console) throws Exception {
        System.out.println("No vault found. Initializing new vault at: " + vaultFile);

        char[] password = console.readPassword("Create your Master Password: ");
        char[] confirm = console.readPassword("Confirm your Master Password: ");

        if (!Arrays.equals(password, confirm)) {
            System.err.println("Passwords do not match. Exiting.");
            return;
        }

        VaultPayload initialPayload = new VaultPayload(Instant.now().toString(), new ArrayList<>());

        try {
            orchestrator.lockAndSave(initialPayload, password, vaultFile);
            System.out.println("Success! Vault created and encrypted.");
        } finally {
            Arrays.fill(password, '\0');
            Arrays.fill(confirm, '\0');
        }
    }

    private void handleUnlockAndInteract(Console console) {
        char[] password = console.readPassword("Enter Master Password to unlock vault: ");
        VaultPayload payload;

        try {
            payload = orchestrator.unlockAndLoad(vaultFile, password);
            System.out.println("Vault unlocked successfully! Last updated: " + payload.lastUpdated());
        } catch (Exception e) {
            System.err.println("Unlock failed: " + e.getMessage());
            return;
        }

        Scanner scanner = new Scanner(System.in);
        boolean running = true;

        while (running) {
            System.out.println("\n--- Vault Menu ---");
            System.out.println("1. View Secrets");
            System.out.println("2. Add New Secret");
            System.out.println("3. Lock and Exit");
            System.out.print("Choose an option: ");

            String choice = scanner.nextLine();

            switch (choice) {
                case "1":
                    displaySecrets(payload);
                    break;
                case "2":
                    // Capture the newly generated payload so our loop has the latest timestamp
                    payload = addNewSecretAndSave(payload, scanner, password, vaultFile);
                    break;
                case "3":
                    running = false;
                    System.out.println("Vault locked. Goodbye.");
                    break;
                default:
                    System.out.println("Invalid option.");
            }
        }

        // Scrub the password explicitly when the loop ends
        Arrays.fill(password, '\0');
        System.exit(0);
    }

    private void displaySecrets(VaultPayload payload) {
        if (payload.credentials().isEmpty()) {
            System.out.println("\n[ Vault is empty ]");
            return;
        }

        System.out.println("\n--- Your Credentials ---");
        for (Credential cred : payload.credentials()) {
            System.out.println("Target: " + cred.target());
            System.out.println("Notes: " + cred.notes());
            System.out.println("Secrets:");
            cred.getSecrets().forEach((k, v) -> System.out.println("  " + k + " : " + v));
            System.out.println("-");
        }
    }

    // Notice the updated signature: it now requires the password to save,
    // and returns the updated VaultPayload record.
    private VaultPayload addNewSecretAndSave(VaultPayload currentPayload, Scanner scanner, char[] password, Path vaultFile) {
        System.out.println("\n--- Add New Credential ---");
        System.out.print("Target (e.g., google.com): ");
        String target = scanner.nextLine();

        System.out.print("Notes: ");
        String notes = scanner.nextLine();

        Credential newCred = new Credential(target, notes, null);

        while (true) {
            System.out.print("Add a secret key (e.g., 'password', 'pin') or type 'done' to finish: ");
            String key = scanner.nextLine();
            if (key.equalsIgnoreCase("done")) break;

            System.out.print("Enter value for " + key + ": ");
            String value = scanner.nextLine();

            newCred.addSecret(key, value);
        }

        // Update the in-memory list
        currentPayload.credentials().add(newCred);

        // Generate a new Payload wrapper with a fresh timestamp
        VaultPayload updatedPayload = new VaultPayload(Instant.now().toString(), currentPayload.credentials());

        System.out.println("Encrypting and saving vault...");
        try {
            orchestrator.lockAndSave(updatedPayload, password, vaultFile);
            System.out.println("Vault securely saved to disk.");
            return updatedPayload;
        } catch (Exception e) {
            System.err.println("Critical Error saving vault: " + e.getMessage());
            // If the save fails, we should ideally remove the unsaved credential from memory
            // to prevent the user from assuming it is safe.
            currentPayload.credentials().remove(newCred);
            return currentPayload;
        }
    }
}