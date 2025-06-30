import { handlers } from "@/mcpauth"
import { NextRequest } from "next/server";

const logRequest = async (req: NextRequest) => {
  const url = req.nextUrl.clone();
  console.log(`\n--- Start Request: ${req.method} ${url.pathname}${url.search} ---`);
  console.log(`[${new Date().toISOString()}]`);
  console.log('Request Headers:', Object.fromEntries(req.headers.entries()));
  
  const contentType = req.headers.get('content-type');
  if (req.headers.get('content-length') || req.headers.get('transfer-encoding')) {
    const clonedReq = req.clone();
    if (contentType?.includes('application/json')) {
      try {
        const body = await clonedReq.json();
        console.log('Request Body (json):', body);
      } catch (e) {
        console.log('Request Body (raw json):', await clonedReq.text());
      }
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await clonedReq.formData();
      console.log('Request Body (form):', Object.fromEntries(formData.entries()));
    } else {
        console.log('Request Body: Present (type not logged)');
    }
  }
};

const logResponse = async (res: Response) => {
    console.log(`--- End Request ---`);
    console.log(`Status: ${res.status}`);
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()));

    const clonedRes = res.clone();
    if (res.status === 302) {
        console.log('Redirecting to:', clonedRes.headers.get('location'));
    } else {
        const contentType = clonedRes.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            try {
                const body = await clonedRes.json();
                console.log('Response Body:', body);
            } catch (e) {
                console.log('Response Body (raw json):', await clonedRes.text());
            }
        } else {
            const bodyText = await clonedRes.text();
            if (bodyText) {
                const truncatedBody = bodyText.slice(0, 500) + (bodyText.length > 500 ? '...' : '');
                console.log('Response Body (raw):', truncatedBody);
            }
        }
    }
    console.log(`-----------------\n`);
};

const originalGET = handlers.GET;
const originalPOST = handlers.POST;
const originalOPTIONS = handlers.OPTIONS;

export const GET = async (req: NextRequest, context: { params: any }) => {
  await logRequest(req);
  const response = await originalGET(req, context);
  await logResponse(response);
  return response;
};

export const POST = async (req: NextRequest, context: { params: any }) => {
  await logRequest(req);
  const response = await originalPOST(req, context);
  await logResponse(response);
  return response;
};

export const OPTIONS = async (req: NextRequest, context: { params: any }) => {
    await logRequest(req);
    const response = await originalOPTIONS(req, context);
    await logResponse(response);
    return response;
};
