# Student Time Management for M365 - Solution Architecture

> Complete technical documentation with architecture diagrams for the Student Login Time Restriction solution.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Cost & Licensing](#cost--licensing)
3. [Implementation Timeline](#implementation-timeline)
4. [Solution Overview](#solution-overview)
5. [Architecture Diagrams](#architecture-diagrams)
6. [Component Details](#component-details)
7. [Data Flow](#data-flow)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Alternative Solutions](#alternative-solutions)

---

## Executive Summary

This solution restricts student Microsoft 365 login times to school hours (07:55 AM - 04:05 PM, Monday-Friday) using Azure Automation and Microsoft Graph API in a cloud-only Entra ID environment. **Students remain disabled throughout weekends** (Saturday & Sunday).

### Key Facts

| Aspect | Details |
|--------|---------|
| **Problem** | Native time-based login restrictions not available in cloud-only Entra ID |
| **Solution** | Azure Automation scheduled runbooks |
| **Schedule** | Mon-Fri: 07:55 AM - 04:05 PM |
| **Weekends** | 🔴 **Disabled all day Saturday & Sunday** |
| **Monthly Cost** | Script-only: **0 NOK/month** · With portal: **720 NOK/month** |
| **Setup Time** | 2-4 hours (+ Azure subscription setup if needed) |
| **Affected Users** | Only members of student security group |
| **Not Affected** | Teachers, admins, staff (not in student group) |
| **Extra Licenses** | ❌ **None required** - Works with existing M365 Education |

---

## Cost & Licensing

### 💰 Total Cost Overview

| Component | Price (NOK) | Notes |
|-----------|-------------|-------|
| **Azure Subscription** | 0 NOK | Pay-as-you-go — no base fee, pay only for resources used |
| **Azure Automation** | **0 NOK/month** | 500 min/month included free. Typical usage: 200–530 min/month |
| **Log Analytics (Basic)** | **0 NOK/month** | 5 GB/day included free. This solution uses < 1 MB/day |
| **App Service B1** (portal only) | **720 NOK/month** | Norway East list price. Only needed for web portal (Option 2) |
| **M365 Education Licenses** | 0 NOK | Already included in existing M365 A agreement |
| **Extra Entra ID Licenses** | 0 NOK | ❌ Not needed |
| **Intune/Device Management** | 0 NOK | ❌ Not needed |
| **GitHub** | 0 NOK | Free plan is sufficient for this solution |
| | | |
| **TOTAL — Script-Only** | **0 NOK/month** | All usage within free tiers |
| **TOTAL — With Portal** | **720 NOK/month** | App Service B1 only |

### 📋 Azure Subscription Setup (Required)

Since you don't have an Azure subscription, here's how to get one:

#### Option A: Azure for Nonprofits (Recommended) 🌟

| Step | Action | Time |
|------|--------|------|
| 1 | Go to [nonprofit.microsoft.com](https://nonprofit.microsoft.com) | - |
| 2 | Verify nonprofit status (need registration docs) | 1-5 days |
| 3 | Receive **$3,500 USD/year** in Azure credits | - |
| 4 | Create Azure subscription under nonprofit tenant | 10 min |

**Benefits:**
- First year essentially **FREE**
- Covers this solution + many other Azure services
- Renews annually with continued nonprofit status

#### Option B: Pay-As-You-Go (Immediate)

| Step | Action | Time |
|------|--------|------|
| 1 | Go to [portal.azure.com](https://portal.azure.com) | - |
| 2 | Sign in with your M365 admin account | - |
| 3 | Create new subscription (credit card required) | 10 min |
| 4 | Monthly cost: **0 NOK** (script-only) or **720 NOK** (with portal, App Service B1) | - |

#### Option C: Azure for Education (If Eligible)

Some educational institutions qualify for Azure for Education:
- **Azure Dev Tools for Teaching**: Free for students/faculty
- **Azure Lab Services**: For classroom environments

### 🔑 License Requirements

**Good news: NO additional licenses needed!**

| What You Have | What You Need | Status |
|---------------|---------------|--------|
| Office 365 A1/A3 for students | ✅ Included | ✅ OK |
| Office 365 A1/A3 for faculty | ✅ Included | ✅ OK |
| Entra ID (Azure AD) Free | ✅ Included with M365 | ✅ OK |
| Microsoft Graph API | ✅ Free | ✅ OK |
| Azure Automation | Consumption-based | ✅ Covered by credits |

**You do NOT need:**
- ❌ Entra ID Premium P1/P2
- ❌ Microsoft Intune
- ❌ Conditional Access (premium)
- ❌ Any per-user licenses

### 🐙 GitHub Enterprise (Optional)

GitHub Enterprise is **only needed** if you want to use Infrastructure as Code (IaC) with CI/CD pipelines:

| Deployment Method | GitHub Required? | Cost |
|-------------------|------------------|------|
| **PowerShell Direct** | ❌ No | 0 NOK |
| **Bicep (Manual)** | ❌ No | 0 NOK |
| **GitHub Actions (IaC)** | ✅ Yes | See below |

**GitHub Pricing for Nonprofits:**

| Plan | Regular Price | Nonprofit Price | Features |
|------|---------------|-----------------|----------|
| **GitHub Free** | 0 NOK | 0 NOK | Public repos, limited Actions |
| **GitHub Team** | ~42 NOK/user/month | **0 NOK** (often free for nonprofits) | Private repos, 3,000 Actions min/month |
| **GitHub Enterprise** | ~221 NOK/user/month | ~42 NOK/user/month | Advanced security, SAML SSO |

**Recommendation:** Start with **GitHub Free** or apply for **GitHub for Nonprofits** at [socialimpact.github.com](https://socialimpact.github.com/tech-for-social-good/nonprofits/)

---

## Implementation Timeline

### ⏱️ Time Estimates

| Phase | Tasks | Duration | Who |
|-------|-------|----------|-----|
| **Pre-requisites** | | **1-5 days** | |
| | Apply for Azure Nonprofits (if applicable) | 1-5 days | Admin |
| | OR Create Pay-as-you-go subscription | 15 min | Admin |
| | Verify Global Admin access | 5 min | Admin |
| **Setup** | | **2-4 hours** | |
| | Create/verify student security group | 15-30 min | Admin |
| | Create App Registration in Entra ID | 15-20 min | Admin |
| | Grant admin consent for permissions | 5 min | Admin |
| | Deploy Azure Automation resources | 30-45 min | Admin/Atea |
| | Configure schedules and variables | 15-20 min | Admin/Atea |
| | Import and publish runbooks | 15-20 min | Admin/Atea |
| **Testing** | | **3-5 days** | |
| | Create test group with 2-3 accounts | 10 min | Admin |
| | Run manual tests (enable/disable) | 30 min | Admin |
| | Monitor for 3-5 days | Passive | Admin |
| | Review job logs and results | 30 min | Admin |
| **Production** | | **1 hour** | |
| | Update StudentGroupId to production group | 10 min | Admin |
| | Communicate to students/staff | 30 min | Admin |
| | Go-live monitoring | 30 min | Admin |
| | | | |
| **TOTAL** | | **2-4 hours active work** | |
| | | **(+ 1-5 days waiting for nonprofit approval if applicable)** | |

### 📅 Typical Project Timeline

```
Week 1:
├── Day 1-2: Apply for Azure Nonprofits / Setup subscription
├── Day 3: Create App Registration + Deploy automation
├── Day 4-5: Testing with test group

Week 2:
├── Day 1-3: Continue monitoring test group
├── Day 4: Switch to production group
├── Day 5: Go-live + monitoring

Total: ~1.5 weeks (can be faster with Pay-as-you-go)
```

### 🚀 Fast-Track Option (Same Day)

If you use Pay-as-you-go Azure subscription:

| Time | Activity |
|------|----------|
| **0:00 - 0:15** | Create Azure subscription |
| **0:15 - 0:45** | Create App Registration |
| **0:45 - 1:30** | Deploy Azure Automation |
| **1:30 - 2:00** | Configure and test |
| **2:00+** | Monitor test group |

**Same-day deployment possible!**

---

## Solution Overview

### Weekly Schedule

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        WEEKLY ACCESS SCHEDULE                                    │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│  MONDAY  │ TUESDAY  │WEDNESDAY │ THURSDAY │  FRIDAY  │ SATURDAY │   SUNDAY     │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│          │          │          │          │          │          │              │
│  07:55   │  07:55   │  07:55   │  07:55   │  07:55   │          │              │
│   🟢     │   🟢     │   🟢     │   🟢     │   🟢     │   🔴     │     🔴       │
│ ENABLED  │ ENABLED  │ ENABLED  │ ENABLED  │ ENABLED  │ DISABLED │  DISABLED    │
│          │          │          │          │          │          │              │
│  16:05   │  16:05   │  16:05   │  16:05   │  16:05   │  ALL     │    ALL       │
│   🔴     │   🔴     │   🔴     │   🔴     │   🔴     │  DAY     │    DAY       │
│ DISABLED │ DISABLED │ DISABLED │ DISABLED │ DISABLED │          │              │
│          │          │          │          │          │          │              │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘
         ↑ Runbooks run Mon-Fri only. Students stay disabled Sat & Sun ↑
```

### Flow Diagram

```mermaid
graph TB
    subgraph "School Hours: Mon-Fri 07:55 - 16:05"
        A[🟢 Students CAN access M365]
    end
    
    subgraph "Outside Hours: Mon-Fri 16:05 - 07:55"
        B[🔴 Students CANNOT access M365]
    end
    
    subgraph "Weekends: All Day Sat & Sun"
        W[🔴 Students DISABLED all weekend]
    end
    
    A -->|Fri 16:05| C{Disable Runbook}
    C --> W
    W -->|Mon 07:55| D{Enable Runbook}
    D --> A
    A -->|16:05 PM| C
    B -->|07:55 AM| D
```

### Who Is Affected?

| User Type | Affected? | Reason |
|-----------|-----------|--------|
| **Students** | ✅ YES | Members of StudentGroupId security group |
| **Teachers** | ❌ NO | Not in the student group |
| **Administrators** | ❌ NO | Not in the student group |
| **Staff** | ❌ NO | Not in the student group |

---

## Architecture Diagrams

### 1. High-Level Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AZURE CLOUD                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        AZURE AUTOMATION                                  │   │
│  │  ┌─────────────────────┐              ┌─────────────────────┐          │   │
│  │  │                     │              │                     │          │   │
│  │  │  Enable-Student     │              │  Disable-Student    │          │   │
│  │  │  Access.ps1         │              │  Access.ps1         │          │   │
│  │  │                     │              │                     │          │   │
│  │  │  ┌───────────────┐  │              │  ┌───────────────┐  │          │   │
│  │  │  │ Schedule:     │  │              │  │ Schedule:     │  │          │   │
│  │  │  │ 07:55 AM      │  │              │  │ 04:05 PM      │  │          │   │
│  │  │  │ Mon-Fri       │  │              │  │ Mon-Fri       │  │          │   │
│  │  │  └───────────────┘  │              │  └───────────────┘  │          │   │
│  │  │                     │              │                     │          │   │
│  │  └──────────┬──────────┘              └──────────┬──────────┘          │   │
│  │             │                                    │                      │   │
│  │             │         ┌──────────────┐          │                      │   │
│  │             │         │  Encrypted   │          │                      │   │
│  │             └────────►│  Variables   │◄─────────┘                      │   │
│  │                       │  - TenantId  │                                  │   │
│  │                       │  - ClientId  │                                  │   │
│  │                       │  - Secret    │                                  │   │
│  │                       │  - GroupId   │                                  │   │
│  │                       └──────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      MICROSOFT GRAPH API                                 │   │
│  │                                                                          │   │
│  │   ┌────────────────────────────────────────────────────────────────┐   │   │
│  │   │  Endpoints Used:                                                │   │   │
│  │   │                                                                 │   │   │
│  │   │  • GET  /groups/{id}/members                                   │   │   │
│  │   │  • GET  /users/{id}                                            │   │   │
│  │   │  • PATCH /users/{id}  { "accountEnabled": true/false }         │   │   │
│  │   │  • POST /users/{id}/revokeSignInSessions                       │   │   │
│  │   │                                                                 │   │   │
│  │   └────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         ENTRA ID (Azure AD)                              │   │
│  │                                                                          │   │
│  │   ┌────────────────────────────────────────────────────────────────┐   │   │
│  │   │  Student Security Group: "Students-M365"                        │   │   │
│  │   │                                                                 │   │   │
│  │   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │   │   │
│  │   │  │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │ │ ... │  500+ users  │   │   │
│  │   │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │   │   │
│  │   │                                                                 │   │   │
│  │   │  accountEnabled: true ◄──────────► accountEnabled: false       │   │   │
│  │   │                                                                 │   │   │
│  │   └────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Sequence Diagram - Enable Flow (Morning)

```
┌──────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────┐
│ Schedule │     │ Azure Automation│     │ Graph API   │     │ Entra ID │
└────┬─────┘     └────────┬────────┘     └──────┬──────┘     └────┬─────┘
     │                    │                     │                  │
     │  07:55 AM Trigger  │                     │                  │
     │───────────────────>│                     │                  │
     │                    │                     │                  │
     │                    │  Connect-MgGraph    │                  │
     │                    │────────────────────>│                  │
     │                    │                     │                  │
     │                    │  Auth Token         │                  │
     │                    │<────────────────────│                  │
     │                    │                     │                  │
     │                    │  Get-MgGroupMember  │                  │
     │                    │────────────────────>│                  │
     │                    │                     │  Query Group     │
     │                    │                     │─────────────────>│
     │                    │                     │                  │
     │                    │                     │  Member List     │
     │                    │                     │<─────────────────│
     │                    │  Members            │                  │
     │                    │<────────────────────│                  │
     │                    │                     │                  │
     │                    │  ┌─────────────────────────────────┐  │
     │                    │  │ For Each Student:               │  │
     │                    │  │                                 │  │
     │                    │  │  Update-MgUser                  │  │
     │                    │  │  accountEnabled = true          │  │
     │                    │  └─────────────────────────────────┘  │
     │                    │────────────────────>│                  │
     │                    │                     │  PATCH User      │
     │                    │                     │─────────────────>│
     │                    │                     │                  │
     │                    │                     │  ✓ Enabled       │
     │                    │                     │<─────────────────│
     │                    │                     │                  │
     │                    │  Disconnect-MgGraph │                  │
     │                    │────────────────────>│                  │
     │                    │                     │                  │
     │  Job Complete      │                     │                  │
     │<───────────────────│                     │                  │
     │                    │                     │                  │
```

### 3. Sequence Diagram - Disable Flow (Afternoon)

```
┌──────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────┐
│ Schedule │     │ Azure Automation│     │ Graph API   │     │ Entra ID │
└────┬─────┘     └────────┬────────┘     └──────┬──────┘     └────┬─────┘
     │                    │                     │                  │
     │  04:05 PM Trigger  │                     │                  │
     │───────────────────>│                     │                  │
     │                    │                     │                  │
     │                    │  Connect-MgGraph    │                  │
     │                    │────────────────────>│                  │
     │                    │                     │                  │
     │                    │  Auth Token         │                  │
     │                    │<────────────────────│                  │
     │                    │                     │                  │
     │                    │  Get-MgGroupMember  │                  │
     │                    │────────────────────>│                  │
     │                    │                     │                  │
     │                    │  Members            │                  │
     │                    │<────────────────────│                  │
     │                    │                     │                  │
     │                    │  ┌─────────────────────────────────┐  │
     │                    │  │ For Each Student:               │  │
     │                    │  │                                 │  │
     │                    │  │  1. Update-MgUser               │  │
     │                    │  │     accountEnabled = false      │  │
     │                    │  │                                 │  │
     │                    │  │  2. Invoke-MgInvalidate         │  │
     │                    │  │     UserRefreshToken            │  │
     │                    │  │     (Force sign-out)            │  │
     │                    │  └─────────────────────────────────┘  │
     │                    │────────────────────>│                  │
     │                    │                     │  PATCH User      │
     │                    │                     │─────────────────>│
     │                    │                     │                  │
     │                    │                     │  ✓ Disabled      │
     │                    │                     │<─────────────────│
     │                    │                     │                  │
     │                    │────────────────────>│                  │
     │                    │                     │  Revoke Sessions │
     │                    │                     │─────────────────>│
     │                    │                     │                  │
     │                    │                     │  ✓ Sessions      │
     │                    │                     │    Revoked       │
     │                    │                     │<─────────────────│
     │                    │                     │                  │
     │  Job Complete      │                     │                  │
     │<───────────────────│                     │                  │
     │                    │                     │                  │
```

### 4. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AZURE SUBSCRIPTION                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                    Resource Group: rg-student-access-automation            │ │
│  │                                                                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │              Automation Account: StudentAccessAutomation             │ │ │
│  │  │                                                                      │ │ │
│  │  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │ │ │
│  │  │  │    RUNBOOKS      │  │    SCHEDULES     │  │    VARIABLES     │ │ │ │
│  │  │  │                  │  │                  │  │                  │ │ │ │
│  │  │  │  • Enable-       │  │  • Enable-       │  │  • TenantId      │ │ │ │
│  │  │  │    Student       │  │    Students-     │  │  • ClientId      │ │ │ │
│  │  │  │    Access.ps1    │  │    Morning       │  │  • ClientSecret  │ │ │ │
│  │  │  │                  │  │    07:55 Mon-Fri │  │    (encrypted)   │ │ │ │
│  │  │  │  • Disable-      │  │                  │  │  • StudentGroupId│ │ │ │
│  │  │  │    Student       │  │  • Disable-      │  │  • RevokeTokens  │ │ │ │
│  │  │  │    Access.ps1    │  │    Students-     │  │                  │ │ │ │
│  │  │  │                  │  │    Afternoon     │  │                  │ │ │ │
│  │  │  │  • Get-Student   │  │    16:05 Mon-Fri │  │                  │ │ │ │
│  │  │  │    Access        │  │                  │  │                  │ │ │ │
│  │  │  │    Status.ps1    │  │                  │  │                  │ │ │ │
│  │  │  │                  │  │                  │  │                  │ │ │ │
│  │  │  └──────────────────┘  └──────────────────┘  └──────────────────┘ │ │ │
│  │  │                                                                      │ │ │
│  │  │  ┌──────────────────────────────────────────────────────────────┐  │ │ │
│  │  │  │                      MODULES                                  │  │ │ │
│  │  │  │                                                               │  │ │ │
│  │  │  │  • Microsoft.Graph.Authentication                            │  │ │ │
│  │  │  │  • Microsoft.Graph.Users                                     │  │ │ │
│  │  │  │  • Microsoft.Graph.Groups                                    │  │ │ │
│  │  │  │                                                               │  │ │ │
│  │  │  └──────────────────────────────────────────────────────────────┘  │ │ │
│  │  │                                                                      │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                            │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        ENTRA ID                                          │   │
│  │                                                                          │   │
│  │   ┌────────────────────────────────────────────────────────────────┐   │   │
│  │   │              App Registration                                   │   │   │
│  │   │              "Student-Access-Automation"                        │   │   │
│  │   │                                                                 │   │   │
│  │   │   ┌─────────────────────────────────────────────────────────┐ │   │   │
│  │   │   │  API Permissions (Application - Admin Consented)        │ │   │   │
│  │   │   │                                                         │ │   │   │
│  │   │   │  ┌─────────────────────────────────────────────────┐   │ │   │   │
│  │   │   │  │ Microsoft Graph                                 │   │ │   │   │
│  │   │   │  │                                                 │   │ │   │   │
│  │   │   │  │  • User.ReadWrite.All    ─── Enable/Disable    │   │ │   │   │
│  │   │   │  │  • Group.Read.All        ─── Read Membership   │   │ │   │   │
│  │   │   │  │  • Directory.Read.All    ─── Read User Data    │   │ │   │   │
│  │   │   │  │                                                 │   │ │   │   │
│  │   │   │  └─────────────────────────────────────────────────┘   │ │   │   │
│  │   │   │                                                         │ │   │   │
│  │   │   └─────────────────────────────────────────────────────────┘ │   │   │
│  │   │                                                                 │   │   │
│  │   │   ┌─────────────────────────────────────────────────────────┐ │   │   │
│  │   │   │  Credentials                                            │ │   │   │
│  │   │   │                                                         │ │   │   │
│  │   │   │  • Client ID (public)                                   │ │   │   │
│  │   │   │  • Client Secret (rotate annually) ──────────────────┐ │ │   │   │
│  │   │   │                                                       │ │ │   │   │
│  │   │   └───────────────────────────────────────────────────────┼─┘ │   │   │
│  │   │                                                           │   │   │   │
│  │   └───────────────────────────────────────────────────────────┼───┘   │   │
│  │                                                               │       │   │
│  └───────────────────────────────────────────────────────────────┼───────┘   │
│                                                                   │           │
│                                                                   ▼           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     AZURE AUTOMATION                                     │ │
│  │                                                                          │ │
│  │   ┌────────────────────────────────────────────────────────────────┐   │ │
│  │   │  Encrypted Variables (AES-256)                                  │   │ │
│  │   │                                                                 │   │ │
│  │   │  🔒 ClientSecret  ◄────────────────────────────────────────────┘   │ │
│  │   │  📋 TenantId                                                        │ │
│  │   │  📋 ClientId                                                        │ │
│  │   │  📋 StudentGroupId                                                  │ │
│  │   │                                                                 │   │ │
│  │   └────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 6. Timeline Diagram

```
        DAILY SCHEDULE (Monday - Friday)
        
  00:00                    07:55        08:00                   16:00  16:05                    23:59
    │                        │            │                       │      │                        │
    │◄───────────────────────┼────────────┼───────────────────────┼──────┼───────────────────────►│
    │                        │            │                       │      │                        │
    │   ACCOUNTS DISABLED    │            │   ACCOUNTS ENABLED    │      │   ACCOUNTS DISABLED    │
    │   🔴 No Access         │            │   🟢 Full Access      │      │   🔴 No Access         │
    │                        │            │                       │      │                        │
    │                        ▼            │                       │      ▼                        │
    │                   ┌─────────┐       │                       │ ┌─────────┐                   │
    │                   │ ENABLE  │       │                       │ │ DISABLE │                   │
    │                   │ RUNBOOK │       │                       │ │ RUNBOOK │                   │
    │                   └─────────┘       │                       │ └─────────┘                   │
    │                        │            │                       │      │                        │
    │                        │            ▼                       ▼      │                        │
    │                        │       ┌─────────────────────────┐        │                        │
    │                        │       │                         │        │                        │
    │                        └──────►│    SCHOOL HOURS         │◄───────┘                        │
    │                                │    08:00 - 16:00        │                                 │
    │                                │                         │                                 │
    │                                └─────────────────────────┘                                 │
    │                                                                                            │
    │◄───────────────────────── 5 min buffer before school ──────►│                             │
    │                                                              │◄── 5 min buffer after ────►│
    │                                                                                            │
```

---

## Component Details

### Runbooks

| Runbook | Purpose | Schedule | Actions |
|---------|---------|----------|---------|
| `Enable-StudentAccess.ps1` | Enable accounts | 07:55 AM, Mon-Fri | Sets `accountEnabled = true` |
| `Disable-StudentAccess.ps1` | Disable accounts | 04:05 PM, Mon-Fri | Sets `accountEnabled = false`, revokes sessions |
| `Get-StudentAccessStatus.ps1` | Status report | On-demand | Lists all students with current status |

### Required PowerShell Modules

| Module | Version | Purpose |
|--------|---------|---------|
| `Microsoft.Graph.Authentication` | Latest | OAuth2 authentication |
| `Microsoft.Graph.Users` | Latest | User management |
| `Microsoft.Graph.Groups` | Latest | Group membership queries |

### API Permissions

| Permission | Type | Purpose | Risk Level |
|------------|------|---------|------------|
| `User.ReadWrite.All` | Application | Enable/disable accounts | High |
| `Group.Read.All` | Application | Read group membership | Medium |
| `Directory.Read.All` | Application | Read user properties | Medium |

---

## Data Flow

### Morning Enable Flow

```
1. Azure Scheduler triggers at 07:55 AM
         │
         ▼
2. Enable-StudentAccess.ps1 starts
         │
         ▼
3. Retrieve encrypted credentials from variables
         │
         ▼
4. Connect to Microsoft Graph API
         │
         ▼
5. Query student group members
         │
         ▼
6. For each student:
   ├── Check current status
   ├── If disabled → Enable account
   └── Log action
         │
         ▼
7. Disconnect and report results
```

### Afternoon Disable Flow

```
1. Azure Scheduler triggers at 04:05 PM
         │
         ▼
2. Disable-StudentAccess.ps1 starts
         │
         ▼
3. Retrieve encrypted credentials from variables
         │
         ▼
4. Connect to Microsoft Graph API
         │
         ▼
5. Query student group members
         │
         ▼
6. For each student:
   ├── Check current status
   ├── If enabled → Disable account
   ├── Revoke all refresh tokens
   └── Log action
         │
         ▼
7. Disconnect and report results
```

---

## Deployment Architecture

### Option A: Direct PowerShell Deployment

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Admin PC       │     │   Azure Portal   │     │   Entra ID       │
│                  │     │                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │
│  │ PowerShell │──┼────►│  │ Automation │  │     │  │    App     │  │
│  │ Scripts    │  │     │  │  Account   │  │     │  │Registration│  │
│  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Option B: Infrastructure as Code (Bicep)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Source Code    │     │   Azure CLI      │     │   Azure          │
│                  │     │                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │
│  │ main.bicep │──┼────►│  │    az      │──┼────►│  │ Resources  │  │
│  │            │  │     │  │ deployment │  │     │  │  Created   │  │
│  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Option C: GitHub Actions (CI/CD)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   GitHub Repo    │     │  GitHub Actions  │     │   Azure          │
│                  │     │                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │
│  │   Push     │──┼────►│  │  Workflow  │──┼────►│  │ Resources  │  │
│  │ to main    │  │     │  │   (OIDC)   │  │     │  │  Deployed  │  │
│  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Alternative Solutions

### Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SOLUTION COMPARISON MATRIX                                  │
├────────────────────────┬─────────┬─────────┬──────────┬───────────┬─────────────┤
│ Solution               │ Cloud   │ UX      │ Cost     │ Complex-  │ Recommended │
│                        │ Only    │ Quality │ /Month   │ ity       │             │
├────────────────────────┼─────────┼─────────┼──────────┼───────────┼─────────────┤
│ ★ Azure Automation     │   ✅    │   ⚠️    │ 0–720 NOK│  Medium   │     ⭐      │
├────────────────────────┼─────────┼─────────┼──────────┼───────────┼─────────────┤
│ Hybrid AD + PTA        │   ❌    │   ✅    │  €€€     │  High     │     ❌      │
├────────────────────────┼─────────┼─────────┼──────────┼───────────┼─────────────┤
│ Intune Device Control  │   ✅    │   ✅    │  Free*   │  Medium   │   Partial   │
├────────────────────────┼─────────┼─────────┼──────────┼───────────┼─────────────┤
│ Conditional Access     │   ✅    │   ✅    │  Free    │  Low      │   N/A**     │
├────────────────────────┼─────────┼─────────┼──────────┼───────────┼─────────────┤
│ Third-party            │   ✅    │   ✅    │~34–92 NOK│  Low      │  If budget  │
│ (GoGuardian, etc.)     │         │         │  /year   │           │  allows     │
└────────────────────────┴─────────┴─────────┴──────────┴───────────┴─────────────┘

* Requires Intune license
** Does not support time-based restrictions
```

---

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Author** | Atea AS |
| **Date** | January 2026 |
| **License** | MIT |
| **Repository** | https://github.com/NorwegianPear/StudentTime-Management-M365 |

---

*For implementation details, see the [README.md](../README.md) file.*
