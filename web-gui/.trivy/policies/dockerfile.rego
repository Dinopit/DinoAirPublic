# METADATA
# title: "DinoAir Docker Security Policy"
# description: "Custom security policies for DinoAir Docker containers"
# scope: package
# schemas:
#   - input: schema["dockerfile"]
# related_resources:
#   - https://docs.docker.com/develop/dev-best-practices/

package dockerfile.security

import rego.v1

# Deny running as root user
deny contains msg if {
    input[i].Cmd == "user"
    val := input[i].Value
    val[0] == "root"
    msg := "Container should not run as root user"
}

# Require non-root user
deny contains msg if {
    not has_user_instruction
    msg := "Dockerfile must specify a non-root USER instruction"
}

has_user_instruction if {
    input[_].Cmd == "user"
}

# Require HEALTHCHECK instruction
deny contains msg if {
    not has_healthcheck
    msg := "Dockerfile should include a HEALTHCHECK instruction"
}

has_healthcheck if {
    input[_].Cmd == "healthcheck"
}

# Deny using :latest tag
deny contains msg if {
    input[i].Cmd == "from"
    val := input[i].Value
    endswith(val[0], ":latest")
    msg := sprintf("Base image should not use :latest tag: %s", [val[0]])
}

# Require specific version tags
deny contains msg if {
    input[i].Cmd == "from"
    val := input[i].Value
    not contains(val[0], ":")
    msg := sprintf("Base image should specify a version tag: %s", [val[0]])
}

# Deny ADD instruction (prefer COPY)
deny contains msg if {
    input[i].Cmd == "add"
    msg := "Use COPY instead of ADD instruction for better security"
}

# Require apt/apk cache cleanup
deny contains msg if {
    input[i].Cmd == "run"
    val := input[i].Value[0]
    contains(val, "apt-get install")
    not contains(val, "rm -rf /var/lib/apt/lists/*")
    msg := "apt-get install should be followed by cache cleanup"
}

deny contains msg if {
    input[i].Cmd == "run"
    val := input[i].Value[0]
    contains(val, "apk add")
    not contains(val, "--no-cache")
    not contains(val, "rm -rf /var/cache/apk/*")
    msg := "apk add should use --no-cache or include cache cleanup"
}

# Deny curl/wget without verification
deny contains msg if {
    input[i].Cmd == "run"
    val := input[i].Value[0]
    regex.match(`(curl|wget).*http://`, val)
    msg := "Avoid downloading over HTTP, use HTTPS instead"
}

# Require EXPOSE instruction for network services
deny contains msg if {
    has_port_binding
    not has_expose_instruction
    msg := "Services with port bindings should have EXPOSE instruction"
}

has_port_binding if {
    input[_].Cmd == "run"
    val := input[_].Value[0]
    regex.match(`.*-p\s+\d+`, val)
}

has_expose_instruction if {
    input[_].Cmd == "expose"
}

# Warn about missing labels
warn contains msg if {
    not has_maintainer_label
    msg := "Consider adding maintainer information with LABEL instruction"
}

has_maintainer_label if {
    input[i].Cmd == "label"
    val := input[i].Value
    val[0] == "maintainer"
}

# Security best practices for Node.js
deny contains msg if {
    input[i].Cmd == "from"
    val := input[i].Value[0]
    startswith(val, "node:")
    not contains(val, "alpine")
    msg := "Consider using Alpine-based Node.js images for smaller attack surface"
}

# Require npm ci instead of npm install in production
deny contains msg if {
    input[i].Cmd == "run"
    val := input[i].Value[0]
    contains(val, "npm install")
    not contains(val, "npm ci")
    msg := "Use 'npm ci' instead of 'npm install' for production builds"
}