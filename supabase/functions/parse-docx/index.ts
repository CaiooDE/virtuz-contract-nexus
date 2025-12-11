import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Simple DOCX parser that extracts text from the document.xml inside the DOCX file
async function extractTextFromDocx(docxArrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(docxArrayBuffer);
  
  // DOCX is a ZIP file, we need to find and extract document.xml
  // ZIP file structure: local file header + file data + central directory
  
  const textDecoder = new TextDecoder("utf-8");
  const fileContent = textDecoder.decode(uint8Array);
  
  // Look for the document.xml content within the DOCX
  // The actual XML content is between specific markers
  const documentXmlStart = fileContent.indexOf("<w:document");
  const documentXmlEnd = fileContent.lastIndexOf("</w:document>") + "</w:document>".length;
  
  if (documentXmlStart === -1 || documentXmlEnd <= documentXmlStart) {
    throw new Error("Could not find document content in DOCX file");
  }
  
  const documentXml = fileContent.substring(documentXmlStart, documentXmlEnd);
  
  // Extract text from XML
  // <w:t> tags contain the actual text
  const textMatches = documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  const paragraphMatches = documentXml.matchAll(/<w:p[^>]*>/g);
  
  // Build the text content preserving paragraph structure
  let result = "";
  let lastIndex = 0;
  
  // Simple approach: collect all text nodes
  const texts: string[] = [];
  for (const match of textMatches) {
    texts.push(match[1]);
  }
  
  // Now build HTML with paragraphs
  let html = "";
  let currentParagraph = "";
  let inParagraph = false;
  
  // More sophisticated parsing: go through the XML sequentially
  let pos = 0;
  while (pos < documentXml.length) {
    // Check for paragraph start
    const pStart = documentXml.indexOf("<w:p", pos);
    const pEnd = documentXml.indexOf("</w:p>", pos);
    
    if (pStart === -1) break;
    
    // Find the end of this paragraph
    const paragraphEnd = documentXml.indexOf("</w:p>", pStart);
    if (paragraphEnd === -1) break;
    
    const paragraphContent = documentXml.substring(pStart, paragraphEnd + 6);
    
    // Extract text from this paragraph
    const paragraphTexts: string[] = [];
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
      paragraphTexts.push(textMatch[1]);
    }
    
    // Check if this paragraph has bold formatting
    const isBold = paragraphContent.includes("<w:b/>") || paragraphContent.includes("<w:b ") || paragraphContent.includes("<w:b>");
    
    const paragraphText = paragraphTexts.join("");
    if (paragraphText.trim()) {
      if (isBold) {
        html += `<p><strong>${paragraphText}</strong></p>`;
      } else {
        html += `<p>${paragraphText}</p>`;
      }
    } else {
      html += "<p></p>";
    }
    
    pos = paragraphEnd + 6;
  }
  
  return html || "<p></p>";
}

// Alternative: Use a more robust approach by fetching from JSZip CDN
async function parseDocxWithZip(docxUrl: string): Promise<string> {
  // Fetch the DOCX file
  const response = await fetch(docxUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Find PK header (ZIP signature)
  if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
    throw new Error("Not a valid DOCX file (missing ZIP signature)");
  }
  
  // Find the central directory
  let centralDirOffset = -1;
  for (let i = uint8Array.length - 22; i >= 0; i--) {
    if (uint8Array[i] === 0x50 && uint8Array[i+1] === 0x4B && uint8Array[i+2] === 0x05 && uint8Array[i+3] === 0x06) {
      centralDirOffset = i;
      break;
    }
  }
  
  if (centralDirOffset === -1) {
    throw new Error("Could not find ZIP central directory");
  }
  
  // Read central directory offset
  const view = new DataView(arrayBuffer);
  const cdOffset = view.getUint32(centralDirOffset + 16, true);
  const cdSize = view.getUint32(centralDirOffset + 12, true);
  
  // Parse local file headers to find document.xml
  let pos = 0;
  const files: { name: string; offset: number; compressedSize: number; uncompressedSize: number; compressionMethod: number }[] = [];
  
  while (pos < uint8Array.length - 4) {
    if (uint8Array[pos] === 0x50 && uint8Array[pos+1] === 0x4B && uint8Array[pos+2] === 0x03 && uint8Array[pos+3] === 0x04) {
      const compressionMethod = view.getUint16(pos + 8, true);
      const compressedSize = view.getUint32(pos + 18, true);
      const uncompressedSize = view.getUint32(pos + 22, true);
      const fileNameLength = view.getUint16(pos + 26, true);
      const extraLength = view.getUint16(pos + 28, true);
      
      const fileName = new TextDecoder().decode(uint8Array.slice(pos + 30, pos + 30 + fileNameLength));
      const dataOffset = pos + 30 + fileNameLength + extraLength;
      
      files.push({
        name: fileName,
        offset: dataOffset,
        compressedSize,
        uncompressedSize,
        compressionMethod
      });
      
      pos = dataOffset + compressedSize;
    } else {
      pos++;
    }
  }
  
  // Find word/document.xml
  const documentFile = files.find(f => f.name === "word/document.xml");
  if (!documentFile) {
    throw new Error("Could not find word/document.xml in DOCX");
  }
  
  let documentXml: string;
  
  if (documentFile.compressionMethod === 0) {
    // No compression (STORE)
    const xmlBytes = uint8Array.slice(documentFile.offset, documentFile.offset + documentFile.uncompressedSize);
    documentXml = new TextDecoder().decode(xmlBytes);
  } else if (documentFile.compressionMethod === 8) {
    // DEFLATE compression
    const compressedData = uint8Array.slice(documentFile.offset, documentFile.offset + documentFile.compressedSize);
    
    // Use DecompressionStream for deflate-raw
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(compressedData);
    writer.close();
    
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    documentXml = new TextDecoder().decode(result);
  } else {
    throw new Error(`Unsupported compression method: ${documentFile.compressionMethod}`);
  }
  
  // Parse the XML and extract text with structure
  let html = "";
  let pos2 = 0;
  
  while (pos2 < documentXml.length) {
    const pStart = documentXml.indexOf("<w:p", pos2);
    if (pStart === -1) break;
    
    const pEnd = documentXml.indexOf("</w:p>", pStart);
    if (pEnd === -1) break;
    
    const paragraphContent = documentXml.substring(pStart, pEnd + 6);
    
    // Extract runs (w:r) with their formatting
    let paragraphHtml = "";
    let runPos = 0;
    
    while (runPos < paragraphContent.length) {
      const runStart = paragraphContent.indexOf("<w:r>", runPos);
      const runStartAlt = paragraphContent.indexOf("<w:r ", runPos);
      
      let actualRunStart = -1;
      if (runStart !== -1 && runStartAlt !== -1) {
        actualRunStart = Math.min(runStart, runStartAlt);
      } else if (runStart !== -1) {
        actualRunStart = runStart;
      } else if (runStartAlt !== -1) {
        actualRunStart = runStartAlt;
      }
      
      if (actualRunStart === -1) break;
      
      const runEnd = paragraphContent.indexOf("</w:r>", actualRunStart);
      if (runEnd === -1) break;
      
      const runContent = paragraphContent.substring(actualRunStart, runEnd + 6);
      
      // Check formatting in w:rPr
      const isBold = runContent.includes("<w:b/>") || runContent.includes("<w:b>") || (runContent.includes("<w:b ") && !runContent.includes('w:val="0"'));
      const isItalic = runContent.includes("<w:i/>") || runContent.includes("<w:i>") || (runContent.includes("<w:i ") && !runContent.includes('w:val="0"'));
      const isUnderline = runContent.includes("<w:u ");
      
      // Extract text
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let textMatch;
      let runText = "";
      while ((textMatch = textRegex.exec(runContent)) !== null) {
        runText += textMatch[1];
      }
      
      if (runText) {
        let formattedText = runText;
        if (isUnderline) formattedText = `<u>${formattedText}</u>`;
        if (isItalic) formattedText = `<em>${formattedText}</em>`;
        if (isBold) formattedText = `<strong>${formattedText}</strong>`;
        paragraphHtml += formattedText;
      }
      
      runPos = runEnd + 6;
    }
    
    // Check for list items
    const isListItem = paragraphContent.includes("<w:numPr>");
    
    if (isListItem) {
      html += `<li>${paragraphHtml || "&nbsp;"}</li>`;
    } else {
      html += `<p>${paragraphHtml || ""}</p>`;
    }
    
    pos2 = pEnd + 6;
  }
  
  // Clean up empty paragraphs and wrap lists
  html = html.replace(/<p><\/p>/g, "<p>&nbsp;</p>");
  
  // Wrap consecutive li elements in ul
  html = html.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");
  
  return html || "<p></p>";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_url } = await req.json();
    
    if (!template_url) {
      return new Response(
        JSON.stringify({ error: "template_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing DOCX from URL:", template_url);
    
    const htmlContent = await parseDocxWithZip(template_url);
    
    console.log("Successfully extracted HTML content, length:", htmlContent.length);

    return new Response(
      JSON.stringify({ html: htmlContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
