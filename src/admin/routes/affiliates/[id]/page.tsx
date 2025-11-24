import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, StatusBadge, Button, Table } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

const AffiliateDetail = () => {
  const { id } = useParams()
  const [affiliate, setAffiliate] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAffiliate = async () => {
      try {
        const res = await fetch(`/admin/affiliates/${id}`)
        const data = await res.json()
        setAffiliate(data.affiliate)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchAffiliate()
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
            <Text>{affiliate.total_earnings}</Text>
          </div>
        </div>
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
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Affiliate Details",
})

export default AffiliateDetail
