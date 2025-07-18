// This file is deprecated. Use awsClients.ts instead for better configuration support.
// Keeping for backward compatibility.

import { SupportClient } from "@aws-sdk/client-support";

// Initialize the Support client in us-east-1 region as Trusted Advisor
// is only available in this region
export const supportClient = new SupportClient({ region: "us-east-1" });