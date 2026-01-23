import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text as MedusaText, StatusBadge, Button, Table } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

const AffiliateDetail = () => {
  const { id } = useParams()
  const [affiliate, setAffiliate] = useState<any>(null)
  const [commissionRate, setCommissionRate] = useState(0.1)
  const [stats, setStats] = useState<any>(null)
  const [promoCodes, setPromoCodes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statsFrom, setStatsFrom] = useState("")
  const [statsTo, setStatsTo] = useState("")
  const [newPromoCode, setNewPromoCode] = useState({ code: "", value: 10, type: "percentage" })
  const [isCreatingPromo, setIsCreatingPromo] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        let statsUrl = `/admin/affiliates/${id}/stats?`
        if (statsFrom) statsUrl += `from=${statsFrom}&`
        if (statsTo) statsUrl += `to=${statsTo}&`
        else if (!statsFrom) statsUrl += `days=30`

        const [affRes, statsRes, promoRes] = await Promise.all([
          fetch(`/admin/affiliates/${id}`),
          fetch(statsUrl),
          fetch(`/admin/affiliates/${id}/promo-codes`)
        ])
        const affData = await affRes.json()
        const statsData = await statsRes.json()
        const promoData = await promoRes.json()

        setAffiliate(affData.affiliate)
        setCommissionRate(affData.affiliate.commission_rate ?? 0.1)
        setStats(statsData)
        setPromoCodes(promoData.promo_codes || [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, statsFrom, statsTo])

  if (isLoading || !affiliate) {
    return <Container>Loading...</Container>
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await fetch(`/admin/affiliates/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      setAffiliate({ ...affiliate, status: newStatus })
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateCommission = async () => {
    try {
      await fetch(`/admin/affiliates/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: commissionRate })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleSettleBalance = async () => {
    if (!confirm("Are you sure you have paid this affiliate? This will reset their balance to 0.")) return;

    try {
      const res = await fetch(`/admin/affiliates/${id}/settle`, {
        method: 'POST'
      })
      if (res.ok) {
        setAffiliate({ ...affiliate, balance: 0 })
        alert("Settlement recorded successfully")
      }
    } catch (e) {
      console.error(e)
      alert("Failed to settle balance")
    }
  }

  const handleCreatePromoCode = async () => {
    if (!newPromoCode.code) return alert("Please enter a code")
    setIsCreatingPromo(true)
    try {
      const res = await fetch(`/admin/affiliates/${id}/promo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newPromoCode.code,
          discount_type: newPromoCode.type,
          discount_value: newPromoCode.value,
          commission_rate: commissionRate
        })
      })
      if (res.ok) {
        const data = await res.json()
        setPromoCodes([...promoCodes, data.promo_code])
        setNewPromoCode({ code: "", value: 10, type: "percentage" })
        alert("Promo code created successfully")
      } else {
        const err = await res.json()
        alert(`Error: ${err.message}`)
      }
    } catch (e) {
      console.error(e)
      alert("Failed to create promo code")
    } finally {
      setIsCreatingPromo(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <Heading level="h1">{affiliate.first_name} {affiliate.last_name}</Heading>
          <div className="flex gap-x-2">
            {affiliate.status === 'pending' && (
              <>
                <Button onClick={() => handleStatusChange('active')} variant="primary">Approve</Button>
                <Button onClick={() => handleStatusChange('rejected')} variant="danger">Reject</Button>
              </>
            )}
            {affiliate.status === 'active' && (
              <Button onClick={() => handleStatusChange('suspended')} variant="danger">Suspend</Button>
            )}
            {affiliate.status === 'suspended' && (
              <Button onClick={() => handleStatusChange('active')} variant="primary">Reactivate</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <MedusaText className="text-ui-fg-subtle">Email</MedusaText>
            <MedusaText>{affiliate.email}</MedusaText>
          </div>
          <div>
            <MedusaText className="text-ui-fg-subtle">Referral Code</MedusaText>
            <MedusaText>{affiliate.code}</MedusaText>
          </div>
          <div>
            <MedusaText className="text-ui-fg-subtle">Status</MedusaText>
            <StatusBadge color={
              affiliate.status === 'active' ? 'green' :
                affiliate.status === 'pending' ? 'orange' : 'red'
            }>
              {affiliate.status}
            </StatusBadge>
          </div>
          <div>
            <MedusaText className="text-ui-fg-subtle">Total Earnings</MedusaText>
            <MedusaText>${Number(affiliate.total_earnings || 0).toFixed(2)}</MedusaText>
          </div>
          <div>
            <MedusaText className="text-ui-fg-subtle">Current Balance</MedusaText>
            <div className="flex items-center gap-x-2">
              <MedusaText className="text-xl font-bold">${Number(affiliate.balance || 0).toFixed(2)}</MedusaText>
              {Number(affiliate.balance) > 0 && (
                <Button size="small" variant="secondary" onClick={handleSettleBalance}>
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
          <div>
            <MedusaText className="text-ui-fg-subtle">Commission Rate</MedusaText>
            <div className="flex items-center gap-x-2">
              <input
                type="number"
                step="0.01"
                className="w-20 border rounded px-1 py-0.5 text-small"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                onBlur={handleUpdateCommission}
              />
              <MedusaText className="text-ui-fg-subtle text-xs">{(commissionRate * 100).toFixed(0)}%</MedusaText>
            </div>
          </div>
        </div>
      </Container >

      {stats && (
        <Container>
          <div className="flex items-center justify-between mb-4">
            <Heading level="h2">Performance ({stats.period})</Heading>
            <div className="flex gap-x-2">
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={statsFrom}
                onChange={(e) => setStatsFrom(e.target.value)}
              />
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={statsTo}
                onChange={(e) => setStatsTo(e.target.value)}
              />
              <Button size="small" variant="secondary" onClick={() => { setStatsFrom(""); setStatsTo(""); }}>Reset</Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <MedusaText className="text-ui-fg-subtle text-sm">Clicks</MedusaText>
              <Heading level="h2">{stats.totalClicks}</Heading>
            </div>
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <MedusaText className="text-ui-fg-subtle text-sm">Conversions</MedusaText>
              <Heading level="h2">{stats.totalConversions}</Heading>
            </div>
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <MedusaText className="text-ui-fg-subtle text-sm">Revenue</MedusaText>
              <Heading level="h2">${stats.totalRevenue.toFixed(2)}</Heading>
            </div>
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <MedusaText className="text-ui-fg-subtle text-sm">Commission</MedusaText>
              <Heading level="h2">${stats.totalCommission.toFixed(2)}</Heading>
            </div>
          </div>
        </Container>
      )}

      <Container>
        <Heading level="h2" className="mb-4">Promo Codes</Heading>
        <div className="flex gap-x-4 mb-6 p-4 bg-ui-bg-subtle rounded-lg items-end">
          <div className="flex flex-col gap-y-1">
            <MedusaText size="small" className="text-ui-fg-subtle">Code</MedusaText>
            <input
              type="text"
              placeholder="e.g. SAVE10"
              className="border rounded px-2 py-1 text-small w-32"
              value={newPromoCode.code}
              onChange={(e) => setNewPromoCode({ ...newPromoCode, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <MedusaText size="small" className="text-ui-fg-subtle">Value</MedusaText>
            <input
              type="number"
              className="border rounded px-2 py-1 text-small w-20"
              value={newPromoCode.value}
              onChange={(e) => setNewPromoCode({ ...newPromoCode, value: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <MedusaText size="small" className="text-ui-fg-subtle">Type</MedusaText>
            <select
              className="border rounded px-2 py-1 text-small"
              value={newPromoCode.type}
              onChange={(e) => setNewPromoCode({ ...newPromoCode, type: e.target.value })}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <Button
            size="small"
            onClick={handleCreatePromoCode}
            isLoading={isCreatingPromo}
            disabled={!newPromoCode.code}
          >
            Add Promo Code
          </Button>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Code</Table.HeaderCell>
              <Table.HeaderCell>Discount</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Usage</Table.HeaderCell>
              <Table.HeaderCell>Created At</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {promoCodes.map((promo) => (
              <Table.Row key={promo.id}>
                <Table.Cell className="font-mono font-bold">{promo.code}</Table.Cell>
                <Table.Cell>
                  {promo.application_method?.type === "percentage"
                    ? `${promo.application_method.value}%`
                    : `$${promo.application_method?.value}`
                  }
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge color={promo.status === "active" ? "green" : "red"}>
                    {promo.status}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>{promo.used || 0}</Table.Cell>
                <Table.Cell>{new Date(promo.created_at).toLocaleDateString()}</Table.Cell>
              </Table.Row>
            ))}
            {promoCodes.length === 0 && (
              <Table.Row>
                <Table.Cell className="text-center py-4 text-ui-fg-subtle">
                  No promo codes found for this affiliate.
                </Table.Cell>
                <Table.Cell></Table.Cell>
                <Table.Cell></Table.Cell>
                <Table.Cell></Table.Cell>
                <Table.Cell></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Container>

      <Container>
        <Heading level="h2" className="mb-4">Links</Heading>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Code</Table.HeaderCell>
              <Table.HeaderCell>URL</Table.HeaderCell>
              <Table.HeaderCell>Clicks</Table.HeaderCell>
              <Table.HeaderCell>Conversions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {affiliate.links?.map((link: any) => (
              <Table.Row key={link.id}>
                <Table.Cell>{link.code}</Table.Cell>
                <Table.Cell>{link.url}</Table.Cell>
                <Table.Cell>{link.clicks}</Table.Cell>
                <Table.Cell>{link.conversions}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <Container>
        <Heading level="h2" className="mb-4">Settings</Heading>
        <div className="bg-ui-bg-subtle p-4 rounded-lg overflow-auto">
          <pre className="text-xs">{JSON.stringify(affiliate.settings, null, 2)}</pre>
        </div>
      </Container>
    </div >
  )
}

export const config = defineRouteConfig({
  label: "Affiliate Details",
})

export default AffiliateDetail
