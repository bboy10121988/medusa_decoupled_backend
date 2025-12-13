import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, StatusBadge, Button, Table } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

const AffiliateDetail = () => {
  const { id } = useParams()
  const [affiliate, setAffiliate] = useState<any>(null)
  const [commissionRate, setCommissionRate] = useState(0.1)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affRes, statsRes] = await Promise.all([
          fetch(`/admin/affiliates/${id}`),
          fetch(`/admin/affiliates/${id}/stats?days=30`)
        ])
        const affData = await affRes.json()
        const statsData = await statsRes.json()

        setAffiliate(affData.affiliate)
        setCommissionRate(affData.affiliate.commission_rate ?? 0.1)
        setStats(statsData)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

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
            <Text className="text-ui-fg-subtle">Email</Text>
            <Text>{affiliate.email}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle">Referral Code</Text>
            <Text>{affiliate.code}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle">Status</Text>
            <StatusBadge color={
              affiliate.status === 'active' ? 'green' :
                affiliate.status === 'pending' ? 'orange' : 'red'
            }>
              {affiliate.status}
            </StatusBadge>
          </div>
          <div>
            <Text className="text-ui-fg-subtle">Total Earnings</Text>
            <Text>${Number(affiliate.total_earnings || 0).toFixed(2)}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle">Current Balance</Text>
            <div className="flex items-center gap-x-2">
              <Text className="text-xl font-bold">${Number(affiliate.balance || 0).toFixed(2)}</Text>
              {Number(affiliate.balance) > 0 && (
                <Button size="small" variant="secondary" onClick={handleSettleBalance}>
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
          <div>
            <Text className="text-ui-fg-subtle">Commission Rate</Text>
            <div className="flex items-center gap-x-2">
              <input
                type="number"
                step="0.01"
                className="w-20 border rounded px-1 py-0.5 text-small"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                onBlur={handleUpdateCommission}
              />
              <Text className="text-ui-fg-subtle text-xs">{(commissionRate * 100).toFixed(0)}%</Text>
            </div>
          </div>
        </div>
      </Container >

      {stats && (
        <Container>
          <Heading level="h2" className="mb-4">Performance (Last 30 Days)</Heading>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <Text className="text-ui-fg-subtle text-sm">Clicks</Text>
              <Heading level="h2">{stats.totalClicks}</Heading>
            </div>
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <Text className="text-ui-fg-subtle text-sm">Conversions</Text>
              <Heading level="h2">{stats.totalConversions}</Heading>
            </div>
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <Text className="text-ui-fg-subtle text-sm">Revenue</Text>
              <Heading level="h2">${stats.totalRevenue.toFixed(2)}</Heading>
            </div>
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <Text className="text-ui-fg-subtle text-sm">Commission</Text>
              <Heading level="h2">${stats.totalCommission.toFixed(2)}</Heading>
            </div>
          </div>
        </Container>
      )}

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
