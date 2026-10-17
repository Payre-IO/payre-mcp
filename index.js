#!/usr/bin/env node
/**
 * Official Model Context Protocol (MCP) Server for Payre Crypto Payment Gateway
 * PAYRE INFRA LTD (payre.io)
 */

import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = (process.env.PAYRE_BASE_URL || 'https://payre.onrender.com').replace(/\/+$/, '');
const SECRET_KEY = process.env.PAYRE_SECRET_KEY;

if (!SECRET_KEY) {
  console.error('[Payre MCP] CRITICAL: PAYRE_SECRET_KEY environment variable is required.');
  console.error('[Payre MCP] Please provide a valid "sk_live_..." merchant API key.');
  process.exit(1);
}

/**
 * Execute HTTP API request against Payre REST API
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${SECRET_KEY}`,
    'X-API-Key': SECRET_KEY,
    'User-Agent': 'Payre-MCP-Server/1.0',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { error: await res.text() };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data;
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'payre-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ─── 1. REGISTER TOOLS ────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_profile',
        description: 'Get details of the currently authenticated merchant profile, including tier, KYC status, compliance limits, and active business context.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'list_businesses',
        description: 'List all business contexts configured under the merchant account with their payout wallet addresses and domain verification status.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_business',
        description: 'Get full details of a specific business context by UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            business_id: { type: 'string', description: 'UUID of the business context' }
          },
          required: ['business_id']
        }
      },
      {
        name: 'get_active_business',
        description: 'Retrieve the currently active business context used as default for invoice generation.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_business',
        description: 'Create a new business context for receiving direct crypto payments.',
        inputSchema: {
          type: 'object',
          properties: {
            business_name: { type: 'string', description: 'Friendly name of the business' },
            wallet_address: { type: 'string', description: 'EVM payout destination wallet address (0x...) [Optional]' },
            solana_wallet_address: { type: 'string', description: 'Solana payout destination wallet address (Base58) [Optional]' }
          },
          required: ['business_name']
        }
      },
      {
        name: 'update_business',
        description: 'Update an existing business context name, payout wallets, or domain.',
        inputSchema: {
          type: 'object',
          properties: {
            business_id: { type: 'string', description: 'UUID of the business context to update' },
            business_name: { type: 'string', description: 'Updated business name [Optional]' },
            wallet_address: { type: 'string', description: 'Updated EVM payout wallet address [Optional]' },
            solana_wallet_address: { type: 'string', description: 'Updated Solana payout wallet address [Optional]' },
            domain: { type: 'string', description: 'Business domain (e.g. example.com) [Optional]' }
          },
          required: ['business_id']
        }
      },
      {
        name: 'delete_business',
        description: 'Delete a business context by UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            business_id: { type: 'string', description: 'UUID of the business context to delete' }
          },
          required: ['business_id']
        }
      },
      {
        name: 'switch_active_business',
        description: 'Switch the active business context (used as default for checkout invoice generation).',
        inputSchema: {
          type: 'object',
          properties: {
            business_id: { type: 'string', description: 'UUID of the business context to switch to' }
          },
          required: ['business_id']
        }
      },
      {
        name: 'create_invoice',
        description: 'Create a new payment checkout invoice and generate the buyer checkout URL.',
        inputSchema: {
          type: 'object',
          properties: {
            amount_usd: { type: 'number', description: 'Invoiced USD amount (e.g. 29.99)' },
            currency: { type: 'string', description: 'Stablecoin symbol to pay in (default: USDC)', enum: ['USDC', 'USDT'] },
            description: { type: 'string', description: 'Brief description of the order/payment context' },
            expires_in_minutes: { type: 'number', description: 'Invoice expiry in minutes (default: 120)' },
            preferred_chain: { type: 'string', description: 'Base chain key (base or base-sepolia) [Optional]', enum: ['base', 'base-sepolia'] },
            business_id: { type: 'string', description: 'Specific business context UUID. Fallbacks to active business [Optional]' },
            redirect_url: { type: 'string', description: 'URL to redirect customer after successful payment [Optional]' },
            cancel_url: { type: 'string', description: 'URL to redirect customer if cancelled [Optional]' }
          },
          required: ['amount_usd']
        }
      },
      {
        name: 'list_invoices',
        description: 'List invoices created by this merchant, with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max number of invoices to return (default 50, max 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default 0)' },
            business_id: { type: 'string', description: 'Filter invoices by specific business context UUID [Optional]' }
          }
        }
      },
      {
        name: 'get_invoice_details',
        description: 'Get full details of a specific invoice including active payment deposit sessions and payment transactions.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'The UUID of the invoice' }
          },
          required: ['invoice_id']
        }
      },
      {
        name: 'list_transactions',
        description: 'List payment transaction records and ledger settlements associated with the merchant account.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max number of transactions to return (default 50, max 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default 0)' }
          }
        }
      },
      {
        name: 'get_merchant_stats',
        description: 'Retrieve volume analytics, invoice counts (paid/pending/expired), net revenue, and compliance tier limits usage.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'list_chains',
        description: 'Retrieve configured EVM and Solana chains and their active payment currencies/tokens.',
        inputSchema: {
          type: 'object',
          properties: {
            include_inactive: { type: 'boolean', description: 'Include inactive/disabled chains (default false)' }
          }
        }
      },
      {
        name: 'get_webhook_deliveries',
        description: 'Fetch webhook delivery attempt logs for a specific invoice.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'The invoice UUID' },
            limit: { type: 'number', description: 'Max items to return (default 50)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' }
          },
          required: ['invoice_id']
        }
      },
      {
        name: 'get_webhook_secret',
        description: 'Retrieve merchant webhook HMAC signing secret used for verifying webhook callbacks.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'regenerate_api_keys',
        description: 'Regenerate public (pk_live_...) and secret (sk_live_...) API keys for the merchant account.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

// ─── 2. HANDLE TOOL EXECUTIONS ────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_profile': {
        const data = await apiRequest('/merchants/me');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_businesses': {
        const data = await apiRequest('/businesses');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_business': {
        const data = await apiRequest(`/businesses/${args.business_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_active_business': {
        const data = await apiRequest('/businesses/active');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'create_business': {
        const data = await apiRequest('/businesses', {
          method: 'POST',
          body: JSON.stringify(args)
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'update_business': {
        const { business_id, ...updates } = args;
        const data = await apiRequest(`/businesses/${business_id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'delete_business': {
        const data = await apiRequest(`/businesses/${args.business_id}`, {
          method: 'DELETE'
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'switch_active_business': {
        const data = await apiRequest(`/businesses/${args.business_id}/activate`, {
          method: 'POST'
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'create_invoice': {
        const data = await apiRequest('/invoices', {
          method: 'POST',
          body: JSON.stringify(args)
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_invoices': {
        const params = new URLSearchParams();
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.offset) params.set('offset', String(args.offset));
        if (args?.business_id) params.set('business_id', String(args.business_id));
        const data = await apiRequest(`/invoices?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_invoice_details': {
        const data = await apiRequest(`/invoices/${args.invoice_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_transactions': {
        const params = new URLSearchParams();
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.offset) params.set('offset', String(args.offset));
        const data = await apiRequest(`/merchants/transactions?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_merchant_stats': {
        const data = await apiRequest('/merchants/stats');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_chains': {
        const params = new URLSearchParams();
        if (args?.include_inactive) params.set('include_inactive', 'true');
        const data = await apiRequest(`/checkout/chains?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_webhook_deliveries': {
        const params = new URLSearchParams();
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.offset) params.set('offset', String(args.offset));
        const data = await apiRequest(`/invoices/${args.invoice_id}/webhooks?${params.toString()}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_webhook_secret': {
        const data = await apiRequest('/merchants/webhook-secret');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'regenerate_api_keys': {
        const data = await apiRequest('/merchants/regenerate-keys', {
          method: 'POST'
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error executing tool '${name}': ${err.message}` }],
      isError: true
    };
  }
});

// ─── 3. REGISTER RESOURCES ───────────────────────────────────────────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'payre://docs/supported-chains',
        name: 'Supported Blockchains and Tokens',
        description: 'Documentation of active EVM and Solana chains, contract tokens, and settlement times on Payre.',
        mimeType: 'text/markdown'
      },
      {
        uri: 'payre://merchant/profile',
        name: 'Authenticated Merchant Profile',
        description: 'Live profile data, verification tier, and active business context for this account.',
        mimeType: 'application/json'
      },
      {
        uri: 'payre://merchant/stats',
        name: 'Merchant Volume & Performance Statistics',
        description: 'Revenue totals, paid invoice counts, and rolling tier limit usage.',
        mimeType: 'application/json'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'payre://docs/supported-chains': {
        const chainsData = await apiRequest('/checkout/chains');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(chainsData, null, 2)
            }
          ]
        };
      }

      case 'payre://merchant/profile': {
        const profileData = await apiRequest('/merchants/me');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(profileData, null, 2)
            }
          ]
        };
      }

      case 'payre://merchant/stats': {
        const statsData = await apiRequest('/merchants/stats');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(statsData, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Resource not found: ${uri}`);
    }
  } catch (err) {
    throw new Error(`Failed to read resource '${uri}': ${err.message}`);
  }
});

// ─── 4. REGISTER PROMPT TEMPLATES ────────────────────────────────────────────
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'create-crypto-invoice',
        description: 'Generate a Payre payment checkout link for a customer order with automatic chain selection.',
        arguments: [
          { name: 'amount_usd', description: 'Amount in USD to invoice (e.g. 50.00)', required: true },
          { name: 'description', description: 'Item or service description', required: false },
          { name: 'currency', description: 'USDT or USDC (default: USDT)', required: false }
        ]
      },
      {
        name: 'check-account-status',
        description: 'Inspect current merchant balance, compliance tier limits, and latest payment transactions.',
        arguments: []
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'create-crypto-invoice') {
    return {
      description: 'Generate a Payre payment checkout link',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a Payre crypto payment invoice for $${args?.amount_usd || '0.00'} USD ${args?.description ? `for "${args.description}"` : ''} paying in ${args?.currency || 'USDT'}. Please call the 'create_invoice' tool and provide the buyer checkout URL.`
          }
        }
      ]
    };
  }

  if (name === 'check-account-status') {
    return {
      description: 'Inspect merchant account and transaction summary',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Please check my Payre merchant profile, volume statistics, and recent transactions using the `get_profile`, `get_merchant_stats`, and `list_transactions` tools.'
          }
        }
      ]
    };
  }

  throw new Error(`Prompt template '${name}' not found.`);
});

// ─── 5. SERVER BOOTSTRAP ──────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Payre MCP] 🚀 Payre MCP Server connected and running on stdio transport.');
}

main().catch((err) => {
  console.error('[Payre MCP] Fatal error in main loop:', err);
  process.exit(1);
});
