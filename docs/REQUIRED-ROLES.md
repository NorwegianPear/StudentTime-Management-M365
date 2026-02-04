# Required Roles and Permissions

This document outlines all the required roles and permissions needed to deploy and operate the Student Time Management solution.

---

## 📋 Summary Table

| Task | Required Role/Permission | Who Needs It |
|------|--------------------------|--------------|
| Create App Registration | **Application Administrator** or **Global Administrator** | IT Admin (One-time setup) |
| Grant Admin Consent | **Global Administrator** or **Privileged Role Administrator** | IT Admin (One-time setup) |
| Create Azure Resources | **Contributor** on Azure Subscription | IT Admin (One-time setup) |
| Manage Student Group | **Groups Administrator** or **User Administrator** | IT Admin (One-time setup) |
| View Job History | **Reader** on Automation Account | Support Staff (Operations) |
| Manage Schedules | **Contributor** on Automation Account | IT Admin (Operations) |

---

## 🔐 Entra ID (Azure AD) Roles

### For Initial Deployment

#### 1. Application Administrator
**Required for:** Creating and configuring the App Registration

- Create App Registration in Entra ID
- Configure API permissions
- Create client secrets
- **Note:** Cannot grant admin consent for permissions

#### 2. Global Administrator (Recommended) OR Privileged Role Administrator
**Required for:** Granting admin consent for API permissions

- Grant admin consent for Microsoft Graph permissions
- This is required because the app uses **Application permissions** (not Delegated)

#### 3. Groups Administrator OR User Administrator
**Required for:** Managing the student security group

- Create security groups (if needed)
- Manage group membership
- View group Object IDs

### Role Assignment Summary

| Entra ID Role | Required? | Purpose |
|---------------|-----------|---------|
| Global Administrator | ✅ Recommended | Full access - can perform all tasks |
| Application Administrator | ✅ Alternative | Create App Registration (needs GA for consent) |
| Privileged Role Administrator | ⚠️ Optional | Can grant admin consent (alternative to GA) |
| Groups Administrator | ⚠️ Optional | Manage student group membership |
| User Administrator | ⚠️ Optional | Alternative for group management |

---

## ☁️ Azure Subscription Roles (RBAC)

### For Deployment

#### Contributor (Subscription or Resource Group level)
**Required for:** Deploying Azure resources

- Create Resource Group
- Create Automation Account
- Deploy Bicep/ARM templates
- Configure Automation variables, runbooks, and schedules

#### Owner (Optional)
**Required only if:** You need to assign RBAC roles to others

### For Operations

#### Reader (Minimum for monitoring)
**Required for:** Viewing automation job status

- View job history and outputs
- View runbook status
- View schedule configurations

#### Contributor (For management)
**Required for:** Managing the automation solution

- Modify schedules
- Update runbook code
- Change automation variables

### RBAC Summary Table

| Azure Role | Scope | Purpose | Who Needs It |
|------------|-------|---------|--------------|
| Contributor | Subscription or Resource Group | Deploy and manage all resources | IT Admin |
| Reader | Automation Account | View job history and status | Support Staff |
| Automation Operator | Automation Account | Start/stop runbooks manually | Support Staff |

---

## 📊 Microsoft Graph API Permissions

The App Registration requires the following **Application permissions** (not Delegated):

| Permission | Type | Purpose | Required |
|------------|------|---------|----------|
| `User.ReadWrite.All` | Application | Enable/disable user accounts | ✅ Yes |
| `Group.Read.All` | Application | Read student group membership | ✅ Yes |
| `Directory.Read.All` | Application | Read directory information | ⚠️ Recommended |

### Permission Details

#### User.ReadWrite.All
- **What it does:** Allows the app to read and write all user properties
- **Why needed:** To set `accountEnabled = true/false` on student accounts
- **Scope:** All users in the tenant (filtered by group membership in code)

#### Group.Read.All
- **What it does:** Allows the app to read group memberships
- **Why needed:** To enumerate all students in the target security group
- **Scope:** All groups in the tenant

#### Directory.Read.All (Optional but Recommended)
- **What it does:** Allows reading directory data
- **Why needed:** Better error messages and user property access
- **Scope:** Read-only access to directory

### ⚠️ Important: Admin Consent Required

These are **Application permissions**, not Delegated permissions. This means:
- They require **admin consent** before the app can use them
- The app acts with its own identity, not on behalf of a user
- Only a **Global Administrator** or **Privileged Role Administrator** can grant consent

---

## 🛡️ Security Best Practices

### Principle of Least Privilege

1. **Use dedicated admin accounts** for deployment tasks
2. **Remove elevated access** after deployment is complete
3. **Use time-limited roles** (PIM) if available with Entra ID P2

### Recommended Role Assignment Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PHASE                          │
│                                                              │
│  IT Admin Account:                                           │
│  ├── Entra ID: Global Administrator (temporary)              │
│  └── Azure: Contributor on Subscription                      │
│                                                              │
│  After deployment, reduce to:                                │
│  ├── Entra ID: Application Administrator (if needed)         │
│  └── Azure: Contributor on Resource Group only               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OPERATIONS PHASE                          │
│                                                              │
│  IT Admin Account:                                           │
│  ├── Azure: Contributor on Resource Group                    │
│  └── (Entra ID roles not needed for daily operations)        │
│                                                              │
│  Support Staff Account:                                      │
│  └── Azure: Reader on Automation Account                     │
└─────────────────────────────────────────────────────────────┘
```

### Client Secret Security

- **Store securely:** Client secret is stored encrypted in Azure Automation
- **Rotate regularly:** Rotate the client secret every 12 months
- **Monitor usage:** Enable Azure AD sign-in logs to monitor app usage
- **Never commit secrets:** Never store secrets in source control

---

## 📝 Checklist: Before You Start

### Prerequisites Verification

- [ ] You have an account with **Global Administrator** role in Entra ID
- [ ] You have an account with **Contributor** role on Azure Subscription
- [ ] You have an Azure subscription (Nonprofit or Pay-as-you-go)
- [ ] You have identified or created the student security group

### Permission Verification Commands

Run these commands to verify your permissions:

```powershell
# Check Entra ID roles
Connect-MgGraph -Scopes "RoleManagement.Read.Directory"
$myId = (Get-MgContext).Account
Get-MgUserMemberOf -UserId $myId | Select-Object -ExpandProperty AdditionalProperties

# Check Azure roles
Connect-AzAccount
Get-AzRoleAssignment -SignInName (Get-AzContext).Account.Id | 
    Select-Object RoleDefinitionName, Scope
```

---

## 🔄 Ongoing Access Requirements

### Daily Operations (No special access needed)
- Automation runs automatically on schedule
- No human intervention required

### Periodic Maintenance
| Task | Frequency | Required Access |
|------|-----------|-----------------|
| Review job logs | Weekly | Reader on Automation Account |
| Adjust schedules | As needed | Contributor on Automation Account |
| Rotate client secret | Annually | Application Administrator + Contributor |
| Update student group | As needed | Groups Administrator |

---

## 📚 Additional Resources

- [Entra ID Built-in Roles](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference)
- [Azure RBAC Built-in Roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Azure Automation Security](https://learn.microsoft.com/en-us/azure/automation/automation-security-overview)
