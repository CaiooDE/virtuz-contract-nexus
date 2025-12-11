import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Use fflate for ZIP decompression - a fast, pure JS library
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

async function parseDocxFromUrl(docxUrl: string): Promise<string> {
  console.log("Fetching DOCX from:", docxUrl);
  
  // Fetch the DOCX file
  const response = await fetch(docxUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  console.log("DOCX file size:", uint8Array.length, "bytes");
  
  // Check for ZIP signature
  if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
    throw new Error("Not a valid DOCX file (missing ZIP signature)");
  }
  
  // Unzip the DOCX file
  let unzipped;
  try {
    unzipped = unzipSync(uint8Array);
  } catch (e) {
    console.error("Error unzipping:", e);
    throw new Error("Failed to unzip DOCX file");
  }
  
  // Find word/document.xml
  const documentXmlBytes = unzipped["word/document.xml"];
  if (!documentXmlBytes) {
    console.log("Available files in DOCX:", Object.keys(unzipped));
    throw new Error("Could not find word/document.xml in DOCX");
  }
  
  const documentXml = new TextDecoder("utf-8").decode(documentXmlBytes);
  console.log("document.xml length:", documentXml.length);
  
  // Parse the XML and extract text with structure
  let html = "";
  let pos = 0;
  
  while (pos < documentXml.length) {
    const pStart = documentXml.indexOf("<w:p", pos);
    if (pStart === -1) break;
    
    // Find the closing tag for this paragraph
    let depth = 1;
    let searchPos = pStart + 4;
    let pEnd = -1;
    
    // Find matching </w:p>
    while (searchPos < documentXml.length && depth > 0) {
      const nextOpen = documentXml.indexOf("<w:p", searchPos);
      const nextClose = documentXml.indexOf("</w:p>", searchPos);
      
      if (nextClose === -1) break;
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        searchPos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          pEnd = nextClose;
        }
        searchPos = nextClose + 6;
      }
    }
    
    if (pEnd === -1) {
      pEnd = documentXml.indexOf("</w:p>", pStart);
      if (pEnd === -1) break;
    }
    
    const paragraphContent = documentXml.substring(pStart, pEnd + 6);
    
    // Extract runs (w:r) with their formatting
    let paragraphHtml = "";
    let runPos = 0;
    
    while (runPos < paragraphContent.length) {
      // Find w:r tags
      const runStartMatch = paragraphContent.indexOf("<w:r>", runPos);
      const runStartMatch2 = paragraphContent.indexOf("<w:r ", runPos);
      
      let runStart = -1;
      if (runStartMatch !== -1 && runStartMatch2 !== -1) {
        runStart = Math.min(runStartMatch, runStartMatch2);
      } else if (runStartMatch !== -1) {
        runStart = runStartMatch;
      } else if (runStartMatch2 !== -1) {
        runStart = runStartMatch2;
      }
      
      if (runStart === -1) break;
      
      const runEnd = paragraphContent.indexOf("</w:r>", runStart);
      if (runEnd === -1) break;
      
      const runContent = paragraphContent.substring(runStart, runEnd + 6);
      
      // Check formatting in w:rPr
      const rPrMatch = runContent.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
      const rPrContent = rPrMatch ? rPrMatch[1] : "";
      
      const isBold = rPrContent.includes("<w:b/>") || 
                     rPrContent.includes("<w:b>") || 
                     (rPrContent.includes("<w:b ") && !rPrContent.includes('val="0"') && !rPrContent.includes("val='0'"));
      
      const isItalic = rPrContent.includes("<w:i/>") || 
                       rPrContent.includes("<w:i>") || 
                       (rPrContent.includes("<w:i ") && !rPrContent.includes('val="0"') && !rPrContent.includes("val='0'"));
      
      const isUnderline = rPrContent.includes("<w:u ") && !rPrContent.includes('val="none"');
      
      // Extract text from w:t tags
      const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let textMatch;
      let runText = "";
      
      while ((textMatch = textRegex.exec(runContent)) !== null) {
        runText += textMatch[1];
      }
      
      if (runText) {
        // Escape HTML entities
        runText = runText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/&amp;lt;/g, "&lt;")
          .replace(/&amp;gt;/g, "&gt;")
          .replace(/&amp;amp;/g, "&amp;");
        
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
    
    // Check for heading styles
    const styleMatch = paragraphContent.match(/<w:pStyle\s+w:val="([^"]+)"/);
    const style = styleMatch ? styleMatch[1] : "";
    
    if (isListItem) {
      html += `<li>${paragraphHtml || "&nbsp;"}</li>`;
    } else if (style.toLowerCase().includes("heading1") || style === "Ttulo1") {
      html += `<h1>${paragraphHtml}</h1>`;
    } else if (style.toLowerCase().includes("heading2") || style === "Ttulo2") {
      html += `<h2>${paragraphHtml}</h2>`;
    } else if (style.toLowerCase().includes("heading3") || style === "Ttulo3") {
      html += `<h3>${paragraphHtml}</h3>`;
    } else if (paragraphHtml) {
      html += `<p>${paragraphHtml}</p>`;
    } else {
      // Empty paragraph - keep as spacing
      html += `<p><br></p>`;
    }
    
    pos = pEnd + 6;
  }
  
  // Wrap consecutive li elements in ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
  
  // Remove excessive empty paragraphs
  html = html.replace(/(<p><br><\/p>){3,}/g, "<p><br></p><p><br></p>");
  
  console.log("Final HTML length:", html.length);
  console.log("First 500 chars:", html.substring(0, 500));
  
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
    
    const htmlContent = await parseDocxFromUrl(template_url);
    
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
