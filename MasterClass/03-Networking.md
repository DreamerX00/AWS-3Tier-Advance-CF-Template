# Chapter 3: Networking Foundations - The Bedrock

Networking is the foundation of cloud security. A poorly designed VPC cannot be fixed by application-level code. In AWS, architecture quality is won or lost in the VPC definitions.

## The VPC and Subnet Strategy
A Virtual Private Cloud (VPC) is your logically isolated slice of AWS. We divide it into Subnets, bounded by Availability Zones (AZs) for high availability (HA).

The standard 3-Tier Multi-AZ Architecture:
1.  **Public Subnets (2 or 3 per tier, configurable via `NumberOfAZs`)**: Have a route to the Internet Gateway (IGW). Hosts the Application Load Balancer (ALB) and NAT Gateways.
2.  **Private Application Subnets (2 or 3 per tier, configurable via `NumberOfAZs`)**: Have a route to the NAT Gateway. Hosts ECS Tasks or EC2 Auto Scaling Groups.
3.  **Private Data Subnets (2 or 3 per tier, configurable via `NumberOfAZs`)**: Have NO route to the internet. Hosts RDS databases and ElastiCache.

**Resilience Rule:** ALWAYS deploy across at least two Availability Zones. If an entire AWS data center goes down, your architecture survives.

## Internet Access Paths: IGW vs NAT
Connecting to the internet requires specific gateways and routing configurations.

*   **Internet Gateway (IGW)**: Translates private IPs to public IPs. Bi-directional. A subnet is "public" *strictly because* its Route Table has a route to an IGW.
*   **NAT Gateway**: Network Address Translation. Outbound-only. Placed in a public subnet, it allows private resources to download updates or hit external APIs, but prevents the internet from initiating connections inward.

## Route Tables: The Traffic Directors
Route Tables define forwarding behavior. Without an explicit Route Table Association, subnets fall back to the VPC's main route table (which you should generally leave alone as a black hole).

### YAML Implementation: Public Subnet Route
This is what makes a subnet "Public". Notice the `DestinationCidrBlock: 0.0.0.0/0` (all internet traffic) is routed to the `InternetGateway`.

```yaml
PublicRouteTable:
  Type: AWS::EC2::RouteTable
  Properties:
    VpcId: !Ref VPC

PublicRoute:
  Type: AWS::EC2::Route
  DependsOn: InternetGatewayAttachment # Crucial dependency!
  Properties:
    RouteTableId: !Ref PublicRouteTable
    DestinationCidrBlock: 0.0.0.0/0
    GatewayId: !Ref InternetGateway

PublicSubnet1RouteTableAssociation:
  Type: AWS::EC2::SubnetRouteTableAssociation
  Properties:
    SubnetId: !Ref PublicSubnet1
    RouteTableId: !Ref PublicRouteTable
```

### YAML Implementation: Private Subnet Route
This allows private hosts to patch themselves. Traffic bound for the internet (`0.0.0.0/0`) goes to the NAT Gateway residing in the public subnet.

```yaml
PrivateRouteTable1:
  Type: AWS::EC2::RouteTable
  Properties:
    VpcId: !Ref VPC

PrivateRoute:
  Type: AWS::EC2::Route
  Properties:
    RouteTableId: !Ref PrivateRouteTable1
    DestinationCidrBlock: 0.0.0.0/0
    NatGatewayId: !Ref NatGateway1
```

## Parameterized CIDR Ranges
All 9 subnet CIDRs (3 tiers x 3 AZs) are now exposed as parameters in `root.yaml`. This means users can supply custom VPC CIDR ranges rather than being locked into hardcoded defaults -- essential for environments where the VPC must integrate with existing corporate IP address plans or VPN/peering configurations.

## Conditional 3rd-AZ Resources
The 3rd-AZ NAT Gateways, route tables, and route table associations are all conditional on the `Has3AZs` condition. When `NumberOfAZs` is set to `2`, these resources are simply not created, saving cost while keeping the template ready for 3-AZ expansion at any time.

## Infrastructure Protection with DeletionPolicy
`DeletionPolicy: Retain` is applied to the VPC, Internet Gateway (IGW), and all 3 Elastic IPs (EIPs). This protects foundational network infrastructure from accidental stack deletion -- losing a VPC or its EIPs could break peering connections, DNS entries, and allowlists maintained by external partners.

## VPC Flow Log IAM Scoping
The VPC Flow Log IAM role is scoped to the specific log group ARN (via `!GetAtt VPCFlowLogGroup.Arn`) rather than using `Resource: '*'`. This ensures the flow log role can only write to its designated CloudWatch Log Group, following least-privilege principles even for observability infrastructure.

## DNS Settings in the VPC
Always set `EnableDnsSupport: true` and `EnableDnsHostnames: true` on your `AWS::EC2::VPC` definition. This is strictly required for many AWS Managed Services (like RDS or EFS) to resolve endpoints correctly over private networking.

---

## 🎯 God-Level Checklist for Chapter 3
- [ ] **Can you explain why databases should never be in public subnets?** (Answer: It exposes the data storage layer directly to the internet, bypassing the application logic and WAF security layers, risking severe data breaches if a misconfiguration occurs.)
- [ ] **Can you identify which subnets require a NAT Gateway and why?** (Answer: Private Application subnets require NAT to pull Docker images, update packages, or call third-party APIs like Stripe. Data subnets rarely need NAT.)
- [ ] **What exactly makes a subnet "Public"?** (Answer: A subnet is purely defined as public if its associated Route Table contains a default route `0.0.0.0/0` pointing to an Internet Gateway.)
