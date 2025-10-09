"use client";

import { useMessagePart } from "@assistant-ui/react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import mermaid from "mermaid";
import { FC, useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize, Minimize, Locate } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the MermaidDiagram component
 */
export type MermaidDiagramProps = SyntaxHighlighterProps & {
  className?: string;
};

// Configure mermaid options here
mermaid.initialize({ theme: "default", startOnLoad: false });

/**
 * MermaidDiagram component for rendering Mermaid diagrams
 * Use it by passing to `componentsByLanguage` for mermaid in `markdown-text.tsx`
 *
 * @example
 * const MarkdownTextImpl = () => {
 *   return (
 *     <MarkdownTextPrimitive
 *       remarkPlugins={[remarkGfm]}
 *       className="aui-md"
 *       components={defaultComponents}
 *       componentsByLanguage={{
 *         mermaid: {
 *           SyntaxHighlighter: MermaidDiagram
 *         },
 *       }}
 *     />
 *   );
 * };
 */
export const MermaidDiagram: FC<MermaidDiagramProps> = ({
  code,
  className,
  node: _node,
  components: _components,
  language: _language,
}) => {
  const ref = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [Placeholder, setPlaceholder] = useState("Drawing diagram...");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detect when this code block is complete
  const isComplete = useMessagePart((part) => {
    if (part.type !== "text") return false;

    // Find the position of this code block
    const codeIndex = part.text.indexOf(code);
    if (codeIndex === -1) return false;

    // Check if there are closing backticks immediately after this code block
    const afterCode = part.text.substring(codeIndex + code.length);

    // Look for the closing backticks - should be at the start or after a newline
    const closingBackticksMatch = afterCode.match(/^```|^\n```/);
    return closingBackticksMatch !== null;
  });

  useEffect(() => {
    if (!isComplete) return;

    if (!code || !ref.current) return;

    (async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        await mermaid.parse(code);
        const result = await mermaid.render(id, code);
        if (!result || !result.svg) {
          console.warn("Mermaid did not return any SVG output");
          setPlaceholder("Failed to render diagram, please try again.");
          return;
        }
        if (ref.current) {
          ref.current.innerHTML = result.svg;
          result.bindFunctions?.(ref.current);
        }
      } catch (e) {
        setPlaceholder("Failed to render diagram, please try the prompt again.");
        console.warn("Failed to render Mermaid diagram:", e);
      }
    })();
  }, [isComplete, code]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full bg-muted", isFullscreen && "bg-background")}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit={true}
        centerZoomedOut={true}
        wheel={{ step: 0.1 }}
        doubleClick={{ disabled: false, mode: "reset" }}
        alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 max-h-20">
              <button
                onClick={() => zoomIn()}
                className="rounded bg-background/90 p-2 shadow-md hover:bg-background transition-colors border"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => zoomOut()}
                className="rounded bg-background/90 p-2 shadow-md hover:bg-background transition-colors border"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => resetTransform()}
                className="rounded bg-background/90 p-2 shadow-md hover:bg-background transition-colors border"
                title="Reset View"
                aria-label="Reset View"
              >
                <Locate className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="rounded bg-background/90 p-2 shadow-md hover:bg-background transition-colors border"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>

            {/* Diagram Container */}
            <TransformComponent
              wrapperClass="!w-full !h-auto"
              contentClass="!w-auto !h-auto !mx-auto"
            >
              <pre
                ref={ref}
                className={cn(
                  "aui-mermaid-diagram rounded-b-lg text-center [&_svg]:mx-auto w-full h-full",
                  className,
                )}
              >
                {Placeholder}
              </pre>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

MermaidDiagram.displayName = "MermaidDiagram";
