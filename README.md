# @payre/mcp

The official **Model Context Protocol (MCP)** server for the **Payre Web3 Payment Gateway** by **PAYRE INFRA LTD** ([payre.io](https://payre.io)).

This MCP server allows AI assistants (Claude Desktop, Cursor, Antigravity, Zed, OpenCode, etc.) to securely interact with the Payre direct-to-wallet payment infrastructure to:
- Generate instant non-custodial stablecoin checkout invoices on Base (USDC, USDT)
- Monitor direct-to-wallet settlements and transaction confirmations on Base
- Manage business contexts and Base payout destinations
- Inspect merchant analytics, volume statistics, and compliance tier limits
- Query supported Base network configurations and stablecoin contracts (USDC, USDT)
- Inspect webhook delivery logs and signing secrets

---

## Installation

```bash
# Global install or run directly with npx
npm install -g @payre/mcp
```

---

## Configuration

Set the following environment variables in your MCP client configuration or a local `.env` file:

```env
# Required: Your live merchant Secret API Key (starts with sk_live_...)
PAYRE_SECRET_KEY=sk_live_your_merchant_secret_key_here

# Optional: Payre server URL (defaults to https://payre.onrender.com)
PAYRE_BASE_URL=https://payre.onrender.com
```

---

## MCP Client Setup

### 1. Claude Desktop (`claude_desktop_config.json`)

**On macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**On Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "payre": {
      "command": "npx",
      "args": ["-y", "@payre/mcp"],
      "env": {
        "PAYRE_SECRET_KEY": "sk_live_your_secret_key_here",
        "PAYRE_BASE_URL": "https://payre.onrender.com"
      }
    }
  }
}
```

*Or when running locally from this repository:*

```json
{
  "mcpServers": {
    "payre": {
      "command": "node",
      "args": ["c:/Users/DELL/Projects/payre/payre-mcp/index.js"],
      "env": {
        "PAYRE_SECRET_KEY": "sk_live_your_secret_key_here",
        "PAYRE_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. Cursor IDE (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "payre": {
      "command": "npx",
      "args": ["-y", "@payre/mcp"],
      "env": {
        "PAYRE_SECRET_KEY": "sk_live_your_secret_key_here"
      }
    }
  }
}
```

---

## Available Tools

| Tool Name | Description |
| :--- | :--- |
| **`get_profile`** | Retrieve authenticated merchant details, KYC status, and compliance tier limits. |
| **`list_businesses`** | List all business contexts with EVM & Solana payout wallets and domain verification status. |
| **`get_business`** | Get full details of a specific business context by UUID. |
| **`get_active_business`** | Retrieve the currently active business context. |
| **`create_business`** | Create a new business context with friendly name and payout wallet addresses. |
| **`update_business`** | Update an existing business name, payout wallets, or domain. |
| **`delete_business`** | Delete a business context by UUID. |
| **`switch_active_business`** | Change the default active business context for invoice generation. |
| **`create_invoice`** | Generate a direct-to-wallet crypto checkout invoice and buyer checkout link. |
| **`list_invoices`** | List invoices with status, amounts, and pagination. |
| **`get_invoice_details`** | Deep inspection of an invoice, including active deposit sessions and on-chain tx receipts. |
| **`list_transactions`** | Retrieve settlement transaction records and on-chain receipts. |
| **`get_merchant_stats`** | Retrieve merchant volume analytics, earnings, and rolling tier limit usage. |
| **`list_chains`** | Retrieve active EVM and Solana blockchains and supported token contracts. |
| **`get_webhook_deliveries`** | Inspect webhook delivery history and HTTP response statuses. |
| **`get_webhook_secret`** | Retrieve merchant's HMAC webhook signing secret. |
| **`regenerate_api_keys`** | Regenerate public (`pk_live_...`) and secret (`sk_live_...`) API keys. |

---

## MCP Resources

- **`payre://docs/supported-chains`**: Supported blockchains, tokens, and settlement times.
- **`payre://merchant/profile`**: Merchant account verification tier and profile data.
- **`payre://merchant/stats`**: Performance and revenue metrics.

---

## MCP Prompt Templates

- **`create-crypto-invoice`**: Interactive prompt to assist in generating a payment invoice for a customer.
- **`check-account-status`**: Prompt to review merchant account health, balance, and recent transaction log.

---

## License

MIT © [PAYRE INFRA LTD](https://payre.io)
