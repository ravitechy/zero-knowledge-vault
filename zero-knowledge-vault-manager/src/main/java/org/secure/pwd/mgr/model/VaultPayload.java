package org.secure.pwd.mgr.model;

import java.util.List;

public record VaultPayload(
        String lastUpdated,
        List<Credential> credentials
) {}
