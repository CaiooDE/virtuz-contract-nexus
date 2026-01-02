import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUTENTIQUE_API_URL = "https://api.autentique.com.br/v2/graphql";

interface ContractData {
  contractId: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  documentContent: string; // HTML content
  contractCategory: string; // client, service_provider_pj, service_provider_pf, vendor_service, partnership, other
  signaturePositions?: {
    company: { x: number; y: number; page?: number };
    client: { x: number; y: number; page?: number };
  };
}

// Company signer info
const COMPANY_NAME = "Virtuz Mídia";
const COMPANY_EMAIL = "comercial@virtuzmidia.com.br";

// Determine signer roles based on contract category
// Returns: { companyAction: string, clientAction: string, companyFirst: boolean }
function getSignerRoles(category: string) {
  switch (category) {
    case 'client':
      // Virtuz is CONTRATADA (contracted party), client is CONTRATANTE
      return { companyAction: 'SIGN', clientAction: 'SIGN', companyFirst: false };
    case 'service_provider_pj':
    case 'service_provider_pf':
    case 'vendor_service':
      // Virtuz is CONTRATANTE (contracting party), other party is CONTRATADA
      return { companyAction: 'SIGN', clientAction: 'SIGN', companyFirst: true };
    case 'partnership':
      // Both are partners, Virtuz signs first
      return { companyAction: 'SIGN', clientAction: 'SIGN', companyFirst: true };
    default:
      // Default: Virtuz signs first
      return { companyAction: 'SIGN', clientAction: 'SIGN', companyFirst: true };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const autentiqueToken = Deno.env.get('AUTENTIQUE_API_TOKEN');
    if (!autentiqueToken) {
      console.error('AUTENTIQUE_API_TOKEN not configured');
      throw new Error('Autentique API token not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contractId, documentName, signerName, signerEmail, documentContent, contractCategory, signaturePositions }: ContractData = await req.json();

    console.log(`Sending contract ${contractId} to Autentique for ${signerEmail}, category: ${contractCategory}`);

    if (!contractId || !signerEmail || !documentContent) {
      throw new Error('Missing required fields: contractId, signerEmail, or documentContent');
    }

    // Convert HTML to PDF using a simple approach - create a blob
    // For production, you might want to use a proper HTML to PDF service
    const htmlDocument = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1, h2, h3 { color: #333; }
    p { margin-bottom: 10px; }
    strong { font-weight: bold; }
  </style>
</head>
<body>
${documentContent}
</body>
</html>`;

    // Create a Blob from HTML for upload
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlDocument);
    const blob = new Blob([htmlBytes], { type: 'text/html' });

    // Create FormData for multipart upload
    const formData = new FormData();
    
    const query = `
      mutation CreateDocumentMutation(
        $document: DocumentInput!
        $signers: [SignerInput!]!
        $file: Upload!
      ) {
        createDocument(
          sandbox: false,
          document: $document,
          signers: $signers,
          file: $file
        ) {
          id
          name
          created_at
          signatures {
            public_id
            name
            email
            created_at
            action { name }
            link { short_link }
          }
        }
      }
    `;

    // Determine signer order based on contract category
    const { companyFirst } = getSignerRoles(contractCategory || 'client');
    
    // Default positions if not provided
    const companyPos = signaturePositions?.company || { x: 50, y: 90, page: 1 };
    const clientPos = signaturePositions?.client || { x: 50, y: 95, page: 1 };

    const companySigner = {
      email: COMPANY_EMAIL,
      name: COMPANY_NAME,
      action: "SIGN",
      positions: [{
        x: companyPos.x.toString(),
        y: companyPos.y.toString(),
        z: (companyPos.page ?? 1).toString()
      }]
    };

    const clientSigner = {
      email: signerEmail,
      name: signerName,
      action: "SIGN",
      positions: [{
        x: clientPos.x.toString(),
        y: clientPos.y.toString(),
        z: (clientPos.page ?? 1).toString()
      }]
    };
    
    // Order signers based on contract type
    const signers = companyFirst 
      ? [companySigner, clientSigner] 
      : [clientSigner, companySigner];
    
    console.log(`Signers order: ${companyFirst ? 'Company first' : 'Client first'}`);

    const operations = JSON.stringify({
      query,
      variables: {
        document: { name: documentName || `Contrato - ${signerName}` },
        signers,
        file: null
      }
    });

    formData.append('operations', operations);
    formData.append('map', JSON.stringify({ "0": ["variables.file"] }));
    formData.append('0', blob, `${documentName || 'contrato'}.html`);

    console.log('Sending request to Autentique API...');

    const response = await fetch(AUTENTIQUE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${autentiqueToken}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log('Autentique API response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Autentique response:', responseText);
      throw new Error(`Autentique API returned invalid response: ${responseText}`);
    }

    if (result.errors) {
      console.error('Autentique API errors:', result.errors);
      throw new Error(`Autentique API error: ${JSON.stringify(result.errors)}`);
    }

    const document = result.data?.createDocument;
    if (!document) {
      throw new Error('No document returned from Autentique');
    }

    console.log('Document created in Autentique:', document.id);

    // Get the signature link
    const signatureLink = document.signatures?.[0]?.link?.short_link;

    // Update contract in database
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        autentique_document_id: document.id,
        autentique_signature_link: signatureLink,
        sent_to_autentique_at: new Date().toISOString(),
        status: 'sent_to_client'
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('Error updating contract:', updateError);
      throw new Error(`Failed to update contract: ${updateError.message}`);
    }

    console.log('Contract updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        documentId: document.id,
        signatureLink,
        message: 'Contrato enviado para assinatura no Autentique'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-to-autentique function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
