import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../utils/affiliate-auth"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateAuth = getAffiliateFromRequest(req)
  if (!affiliateAuth) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const affiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id)

  const currentSettings = (affiliate.settings as any) || {}

  // Map to frontend expected format with default values
  const settings = {
    email: affiliate.email,
    displayName: affiliate.first_name ? `${affiliate.first_name} ${affiliate.last_name || ''}`.trim() : affiliate.email,
    website: (affiliate.metadata as any)?.website || '',
    payoutMethod: currentSettings.payoutMethod || 'bank_transfer',
    paypalEmail: currentSettings.paypalEmail || '',
    bankAccount: {
      bankName: currentSettings.bankAccount?.bankName || '',
      accountName: currentSettings.bankAccount?.accountName || '',
      accountNumber: currentSettings.bankAccount?.accountNumber || '',
      branch: currentSettings.bankAccount?.branch || ''
    },
    notifications: {
      emailOnNewOrder: currentSettings.notifications?.emailOnNewOrder ?? true,
      emailOnPayment: currentSettings.notifications?.emailOnPayment ?? true,
      emailOnCommissionUpdate: currentSettings.notifications?.emailOnCommissionUpdate ?? true
    },
    profile: {
      company: currentSettings.profile?.company || '',
      phone: currentSettings.profile?.phone || '',
      address: currentSettings.profile?.address || '',
      taxId: currentSettings.profile?.taxId || ''
    },
    ...currentSettings
  }

  res.json(settings)
}

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateAuth = getAffiliateFromRequest(req)
  if (!affiliateAuth) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const updates = req.body as any

  // Separate standard fields from settings JSON
  const standardUpdates: any = {}
  if (updates.displayName) {
    const parts = updates.displayName.split(' ')
    standardUpdates.first_name = parts[0]
    standardUpdates.last_name = parts.slice(1).join(' ')
  }

  const currentAffiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id)
  const currentSettings = (currentAffiliate.settings as any) || {}
  const currentMetadata = (currentAffiliate.metadata as any) || {}

  if (updates.website) {
    currentMetadata.website = updates.website
  }

  // Merge settings
  const newSettings = {
    ...currentSettings,
    ...updates,
    // Remove fields that are stored elsewhere or shouldn't be in settings
    displayName: undefined,
    website: undefined
  }

  await affiliateService.updateAffiliates({
    id: affiliateAuth.id,
    ...standardUpdates,
    settings: newSettings,
    metadata: currentMetadata
  })

  res.json({ success: true })
}
