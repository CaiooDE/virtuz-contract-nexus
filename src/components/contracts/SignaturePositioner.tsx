import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Building2, User, ArrowDown } from "lucide-react";

interface SignaturePosition {
  x: number; // 0-100 (% within page)
  y: number; // 0-100 (% within page)
  page: number; // 1-based page
}

interface SignaturePositions {
  company: SignaturePosition;
  client: SignaturePosition;
}

interface SignaturePositionerProps {
  templateContent: string;
  positions: SignaturePositions;
  onPositionsChange: (positions: SignaturePositions) => void;
}

// Virtual page height used only for positioning (matches Autentique's page-based placement better than full-document %)
const PAGE_HEIGHT_PX = 1123; // ~A4 at 96dpi (good-enough reference)

export function SignaturePositioner({
  templateContent,
  positions,
  onPositionsChange,
}: SignaturePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"company" | "client" | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!contentRef.current) return;
      setContentHeight(contentRef.current.scrollHeight);
    };

    // measure after layout
    const t = window.setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [templateContent]);

  const pageCount = useMemo(() => {
    const h = contentHeight || PAGE_HEIGHT_PX;
    return Math.max(1, Math.ceil(h / PAGE_HEIGHT_PX));
  }, [contentHeight]);

  const clampPage = useCallback((p: number) => Math.max(1, Math.min(pageCount, p)), [pageCount]);

  const updateOne = useCallback(
    (which: "company" | "client", partial: Partial<SignaturePosition>) => {
      onPositionsChange({
        ...positions,
        [which]: {
          ...positions[which],
          ...partial,
          page: partial.page ? clampPage(partial.page) : positions[which].page,
        },
      });
    },
    [positions, onPositionsChange, clampPage]
  );

  const getPointerPos = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !contentRef.current) return null;
      const contentRect = contentRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop;

      // pointer position inside the *scrolling content*
      const yInContent = clientY - contentRect.top + scrollTop;
      const xInContent = clientX - contentRect.left;

      const page = clampPage(Math.floor(yInContent / PAGE_HEIGHT_PX) + 1);
      const pageTop = (page - 1) * PAGE_HEIGHT_PX;
      const yInPagePx = yInContent - pageTop;

      const contentWidth = contentRef.current.clientWidth || 1;

      const xPct = (xInContent / contentWidth) * 100;
      const yPct = (yInPagePx / PAGE_HEIGHT_PX) * 100;

      return {
        page,
        x: xPct,
        y: yPct,
      };
    },
    [clampPage]
  );

  const handleMouseDown = useCallback(
    (type: "company" | "client") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const pos = getPointerPos(e.clientX, e.clientY);
      if (!pos) return;
      updateOne(dragging, { page: pos.page, x: pos.x, y: pos.y });
    },
    [dragging, getPointerPos, updateOne]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const handleTouchStart = useCallback(
    (type: "company" | "client") => (e: React.TouchEvent) => {
      e.stopPropagation();
      setDragging(type);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      const pos = getPointerPos(touch.clientX, touch.clientY);
      if (!pos) return;
      updateOne(dragging, { page: pos.page, x: pos.x, y: pos.y });
    },
    [dragging, getPointerPos, updateOne]
  );

  const handleTouchEnd = useCallback(() => setDragging(null), []);

  const scrollToEnd = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const scrollToSignature = useCallback(
    (which: "company" | "client") => {
      if (!containerRef.current) return;
      const p = clampPage(positions[which].page);
      const top = (p - 1) * PAGE_HEIGHT_PX;
      containerRef.current.scrollTo({ top: Math.max(0, top - 40), behavior: "smooth" });
    },
    [positions, clampPage]
  );

  const markerStyle = useCallback(
    (pos: SignaturePosition) => {
      const topPx = (pos.page - 1) * PAGE_HEIGHT_PX + (pos.y / 100) * PAGE_HEIGHT_PX;
      return {
        left: `${pos.x}%`,
        top: `${topPx}px`,
        transform: "translate(-50%, -50%)",
      } as React.CSSProperties;
    },
    []
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GripVertical className="h-5 w-5" />
          Posicionar Assinaturas (como no Autentique)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          As assinaturas agora são posicionadas por <strong>página</strong> (page + X/Y) — isso evita cair sempre na primeira página.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={scrollToEnd}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Ir para final
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-sm" />
              <button type="button" className="hover:underline" onClick={() => scrollToSignature("company")}>
                Empresa
              </button>
              <Select
                value={String(positions.company.page)}
                onValueChange={(v) => updateOne("company", { page: Number(v) })}
              >
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue placeholder="Página" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      Página {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
              <button type="button" className="hover:underline" onClick={() => scrollToSignature("client")}>
                Cliente
              </button>
              <Select
                value={String(positions.client.page)}
                onValueChange={(v) => updateOne("client", { page: Number(v) })}
              >
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue placeholder="Página" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      Página {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="border rounded-lg overflow-auto bg-muted/30"
          style={{ height: "550px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div ref={contentRef} className="relative bg-background">
            {/* Virtual page separators */}
            {Array.from({ length: pageCount - 1 }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                className="absolute left-0 right-0 border-t border-dashed border-border/60"
                style={{ top: `${p * PAGE_HEIGHT_PX}px` }}
              />
            ))}

            <div
              className="p-8 text-sm leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: templateContent }}
            />

            {/* Company marker */}
            <div
              className={`absolute select-none ${
                dragging === "company" ? "cursor-grabbing z-50" : "cursor-grab z-40"
              }`}
              style={markerStyle(positions.company)}
              onMouseDown={handleMouseDown("company")}
              onTouchStart={handleTouchStart("company")}
            >
              <div className="bg-blue-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap shadow-lg">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Empresa</span>
              </div>
            </div>

            {/* Client marker */}
            <div
              className={`absolute select-none ${
                dragging === "client" ? "cursor-grabbing z-50" : "cursor-grab z-40"
              }`}
              style={markerStyle(positions.client)}
              onMouseDown={handleMouseDown("client")}
              onTouchStart={handleTouchStart("client")}
            >
              <div className="bg-green-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap shadow-lg">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Cliente</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Empresa: página {positions.company.page}, X {positions.company.x.toFixed(1)}%, Y {positions.company.y.toFixed(1)}% — Cliente: página {positions.client.page}, X {positions.client.x.toFixed(1)}%, Y {positions.client.y.toFixed(1)}%
        </div>
      </CardContent>
    </Card>
  );
}
