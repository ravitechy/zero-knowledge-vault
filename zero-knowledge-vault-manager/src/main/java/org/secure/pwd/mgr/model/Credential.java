package org.secure.pwd.mgr.model;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.HashMap;
import java.util.Map;

public record Credential(
        String target,
        String notes,
        @JsonIgnore Map<String, String> secrets
) {
    // Compact constructor to ensure the map is never null
    public Credential {
        if (secrets == null) {
            secrets = new HashMap<>();
        }
    }

    // Tells Jackson to unwrap the map during serialization
    @JsonAnyGetter
    public Map<String, String> getSecrets() {
        return secrets;
    }

    // Tells Jackson to put any unmapped JSON properties into this map during deserialization
    @JsonAnySetter
    public void addSecret(String key, String value) {
        this.secrets.put(key, value);
    }
}
