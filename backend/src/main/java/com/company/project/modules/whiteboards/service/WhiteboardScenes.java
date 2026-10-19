package com.company.project.modules.whiteboards.service;

import com.company.project.common.exception.BusinessException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Checks an Excalidraw element list before it is stored and writes it in the one form the database holds:
 * {"elements":[...]}. Excalidraw elements carry many drawing fields this class does not care about; it only enforces
 * what keeps the board safe and mergeable for everyone who opens it:
 * <ul>
 *   <li>every element has a string id (unique in the list), a known type and a numeric version - merging two people's
 *       edits compares elements by id and version;</li>
 *   <li>only drawing types are allowed. Images would need file storage this feature does not have, and embeds would make
 *       every viewer's browser load a page another member chose;</li>
 *   <li>an element's link may only be http(s) or mailto, so a link can never run script when clicked;</li>
 *   <li>the stored JSON stays under {@link #MAX_SCENE_BYTES}.</li>
 * </ul>
 */
@Component
public class WhiteboardScenes {

    public static final int MAX_ELEMENTS = 5_000;
    public static final int MAX_SCENE_BYTES = 2 * 1024 * 1024;
    static final int MAX_ID_LENGTH = 100;
    static final int MAX_LINK_LENGTH = 2_000;
    static final Set<String> ALLOWED_TYPES = Set.of(
            "rectangle", "diamond", "ellipse", "arrow", "line", "freedraw", "text", "frame");
    private static final List<String> SAFE_LINK_PREFIXES = List.of("http://", "https://", "mailto:");

    /** A scene ready to store: the canonical JSON and its size in UTF-8 bytes. */
    public record Canonical(String json, int bytes) {
    }

    private final ObjectMapper objectMapper;

    public WhiteboardScenes(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Canonical empty() {
        return canonicalize(List.of());
    }

    /** @throws BusinessException 422 INVALID_SCENE or 413 SCENE_TOO_LARGE, never anything about other boards */
    public Canonical canonicalize(List<ObjectNode> elements) {
        if (elements.size() > MAX_ELEMENTS) {
            throw tooLarge();
        }
        Set<String> ids = new HashSet<>();
        ArrayNode checked = objectMapper.createArrayNode();
        for (ObjectNode element : elements) {
            if (element == null) {
                throw invalid("An element is empty");
            }
            checkElement(element, ids);
            checked.add(element);
        }
        ObjectNode scene = objectMapper.createObjectNode();
        scene.set("elements", checked);
        String json;
        try {
            json = objectMapper.writeValueAsString(scene);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise whiteboard scene", e);
        }
        int bytes = json.getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_SCENE_BYTES) {
            throw tooLarge();
        }
        return new Canonical(json, bytes);
    }

    private void checkElement(ObjectNode element, Set<String> ids) {
        JsonNode id = element.get("id");
        if (id == null || !id.isTextual() || id.asText().isEmpty() || id.asText().length() > MAX_ID_LENGTH) {
            throw invalid("Every element needs an id of at most " + MAX_ID_LENGTH + " characters");
        }
        if (!ids.add(id.asText())) {
            throw invalid("Two elements share the same id");
        }
        JsonNode type = element.get("type");
        if (type == null || !type.isTextual()) {
            throw invalid("Every element needs a type");
        }
        if (!ALLOWED_TYPES.contains(type.asText())) {
            throw invalid("Images and embedded pages are not supported on whiteboards");
        }
        JsonNode version = element.get("version");
        if (version == null || !version.isIntegralNumber()) {
            throw invalid("Every element needs a version number");
        }
        JsonNode link = element.get("link");
        if (link != null && !link.isNull() && !isSafeLink(link)) {
            throw invalid("A link must start with http://, https:// or mailto:");
        }
    }

    private static boolean isSafeLink(JsonNode link) {
        if (!link.isTextual() || link.asText().length() > MAX_LINK_LENGTH) {
            return false;
        }
        String value = link.asText().trim().toLowerCase(Locale.ROOT);
        return value.isEmpty() || SAFE_LINK_PREFIXES.stream().anyMatch(value::startsWith);
    }

    private static BusinessException invalid(String message) {
        return new BusinessException("INVALID_SCENE", message, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    private static BusinessException tooLarge() {
        return new BusinessException(
                "SCENE_TOO_LARGE",
                "This whiteboard is full (at most " + MAX_ELEMENTS + " elements and 2 MB). Start a new board for more.",
                HttpStatus.PAYLOAD_TOO_LARGE);
    }
}
