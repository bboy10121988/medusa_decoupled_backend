import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, StatusBadge, Button } from "@medusajs/ui"
import { useAdminCustomQuery } from "medusa-react" // Or use fetch if hooks not available
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const AffiliateList = () => {
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch affiliates from our custom admin endpoint
    // Since we are in the admin app, we can use the authenticated client or just fetch
    // But for simplicity in this custom route, I'll use fetch with credentials if needed, 
    // or better, assume the admin client is available.
    // Actually, in Medusa v2 Admin, we should use the SDK or fetch.
    
    const fetchAffiliates = async () => {
      try {
        // We need to use the backend URL. In admin dev, it might be proxied.
        const res = await fetch("/admin/affiliates")
        const data = await res.json()
        setAffiliates(data.affiliates || [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAffiliates()
  }, [])

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/admin/affiliates/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      
      if (res.ok) {
        setAffiliates(prev => prev.map(a => 
          a.id === id ? { ...a, status } : a
        ))
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Affiliates</Heading>
        <Button>Create Affiliate</Button>
      </div>
      
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Code</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Earnings</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {affiliates.map((affiliate) => (
            <Table.Row key={affiliate.id}>
              <Table.Cell>{affiliate.email}</Table.Cell>
              <Table.Cell>{affiliate.first_name} {affiliate.last_name}</Table.Cell>
              <Table.Cell>{affiliate.code}</Table.Cell>
              <Table.Cell>
                <StatusBadge color={
                  affiliate.status === 'approved' ? 'green' : 
                  affiliate.status === 'pending' ? 'orange' : 'red'
                }>
                  {affiliate.status}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{affiliate.total_earnings}</Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Link to={`/affiliates/${affiliate.id}`}>
                    <Button variant="secondary" size="small">View</Button>
                  </Link>
                  {affiliate.status === 'pending' && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="small"
                        onClick={() => handleStatusUpdate(affiliate.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="small"
                        onClick={() => handleStatusUpdate(affiliate.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Affiliates",
  icon: "users",
})

export default AffiliateList
