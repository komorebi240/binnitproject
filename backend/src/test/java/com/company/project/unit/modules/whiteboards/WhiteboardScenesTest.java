package com.company.project.unit.modules.whiteboards;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.whiteboards.service.WhiteboardScenes;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** What a whiteboard drawing must look like before it is stored for everyone who opens the board. */
class WhiteboardScenesTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WhiteboardScenes scenes = new WhiteboardScenes(objectMapper);

    private ObjectNode element(String id, String type) {
        ObjectNode element = objectMapper.createObjectNode();
        element.put("id", id);
        element.put("type", type);
        element.put("version", 3);
        element.put("x", 10);
        return element;
    }

    private static void assertRefused(Runnable action, String code) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getCode()).isEqualTo(code));
    }

    @Test
    void anEmptyBoardIsAnEmptyElementList() {
        WhiteboardScenes.Canonical empty = scenes.empty();

        assertThat(empty.json()).isEqualTo("{\"elements\":[]}");
        assertThat(empty.bytes()).isEqualTo(empty.json().length());
    }

    @Test
    void drawingElementsAreStoredAsTheyCameWithTheirSizeInUtf8Bytes() {
        ObjectNode text = element("t1", "text");
        text.put("text", "Họp lúc 9h");

        WhiteboardScenes.Canonical scene = scenes.canonicalize(List.of(element("r1", "rectangle"), text));

        assertThat(scene.json()).startsWith("{\"elements\":[{\"id\":\"r1\"").contains("Họp lúc 9h");
        assertThat(scene.bytes()).isGreaterThan(scene.json().length());
    }

    @Test
    void imagesAndEmbeddedPagesAreRefused() {
        assertRefused(() -> scenes.canonicalize(List.of(element("i1", "image"))), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(element("e1", "embeddable"))), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(element("f1", "iframe"))), "INVALID_SCENE");
    }

    @Test
    void anElementNeedsAnIdATypeAndAVersionAndIdsAreUnique() {
        ObjectNode noId = element("x", "rectangle");
        noId.remove("id");
        ObjectNode numericId = element("x", "rectangle");
        numericId.put("id", 5);
        ObjectNode noType = element("x", "rectangle");
        noType.remove("type");
        ObjectNode textVersion = element("x", "rectangle");
        textVersion.put("version", "3");

        assertRefused(() -> scenes.canonicalize(List.of(noId)), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(numericId)), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(noType)), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(textVersion)), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(element("same", "line"), element("same", "arrow"))), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(element("a".repeat(101), "line"))), "INVALID_SCENE");
    }

    @Test
    void onlyWebAndMailLinksAreKept() {
        ObjectNode web = element("w", "rectangle");
        web.put("link", "https://example.com/plan");
        ObjectNode mail = element("m", "rectangle");
        mail.put("link", "MAILTO:team@example.com");
        ObjectNode none = element("n", "rectangle");
        none.putNull("link");
        ObjectNode blank = element("b", "rectangle");
        blank.put("link", "");
        ObjectNode script = element("s", "rectangle");
        script.put("link", " javascript:alert(1)");
        ObjectNode data = element("d", "rectangle");
        data.put("link", "data:text/html,<script>alert(1)</script>");

        assertThat(scenes.canonicalize(List.of(web, mail, none, blank)).json()).contains("https://example.com/plan");
        assertRefused(() -> scenes.canonicalize(List.of(script)), "INVALID_SCENE");
        assertRefused(() -> scenes.canonicalize(List.of(data)), "INVALID_SCENE");
    }

    @Test
    void aBoardOverTwoMegabytesOrFiveThousandElementsIsFull() {
        ObjectNode huge = element("big", "text");
        huge.put("text", "x".repeat(WhiteboardScenes.MAX_SCENE_BYTES));
        List<ObjectNode> tooMany = new ArrayList<>();
        for (int i = 0; i <= WhiteboardScenes.MAX_ELEMENTS; i++) {
            tooMany.add(element("e" + i, "line"));
        }

        assertRefused(() -> scenes.canonicalize(List.of(huge)), "SCENE_TOO_LARGE");
        assertRefused(() -> scenes.canonicalize(tooMany), "SCENE_TOO_LARGE");
    }
}
