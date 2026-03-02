# ScrapOS ERP - Trial License Information

## Trial Overview

ScrapOS ERP includes a **30-day free trial** that provides full access to all features.

### What's Included in Trial

✅ All ERP modules (Purchases, Sales, Inventory, Finance, Accounting)
✅ Unlimited users
✅ Full reporting capabilities
✅ Data export functionality
✅ Technical support via email

### Trial Limitations

- 30-day time limit from installation date
- Single machine installation
- "Trial Version" watermark on printed documents

---

## License File

The trial license is stored at: `C:\ScrapOS\license.json`

```json
{
  "type": "trial",
  "installDate": "2024-01-15",
  "expiryDate": "2024-02-14",
  "daysRemaining": 30,
  "machineId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "companyName": "Your Company",
  "features": ["full"]
}
```

---

## Trial Expiration

### What Happens When Trial Expires

1. **Days 1-7 before expiry:** Warning banner displayed
2. **On expiry date:** 
   - Application enters read-only mode
   - Can view existing data
   - Cannot create new records
   - Cannot edit existing records
3. **7 days after expiry:**
   - Full lockout
   - Must purchase license to continue

### Extending Trial

Trial extensions are available for evaluation purposes. Contact:
- **Email:** sales@scrapos.ae
- **Subject:** "Trial Extension Request"

Include:
- Company name
- Current license machine ID
- Reason for extension

---

## Purchasing a Full License

### License Types

| License | Users | Price | Support |
|---------|-------|-------|---------|
| Starter | 1-5 | $499/year | Email |
| Business | 6-20 | $999/year | Email + Phone |
| Enterprise | Unlimited | $2,499/year | Priority 24/7 |

### How to Purchase

1. **Online:** https://scrapos.ae/pricing
2. **Email:** sales@scrapos.ae
3. **Phone:** +971-XX-XXX-XXXX

### What You Receive

- Permanent license key
- Removes trial limitations
- Access to updates for license period
- Technical support

---

## Activating Full License

### Step 1: Obtain License Key

After purchase, you'll receive an email with your license key:
```
SCRAP-XXXX-XXXX-XXXX-XXXX
```

### Step 2: Apply License

**Option A: Through Application**
1. Login to ScrapOS
2. Go to Settings → License
3. Enter license key
4. Click "Activate"

**Option B: Manual Activation**
1. Stop ScrapOS services
2. Edit `C:\ScrapOS\license.json`:
   ```json
   {
     "type": "full",
     "licenseKey": "SCRAP-XXXX-XXXX-XXXX-XXXX",
     "activatedDate": "2024-01-15",
     "expiryDate": "2025-01-15",
     "machineId": "auto-detected",
     "companyName": "Your Company",
     "features": ["full"],
     "users": "unlimited"
   }
   ```
3. Restart services

**Option C: Command Line**
```powershell
cd C:\ScrapOS
.\activate-license.ps1 -Key "SCRAP-XXXX-XXXX-XXXX-XXXX"
```

### Step 3: Verify Activation

1. Login to ScrapOS
2. Go to Settings → About
3. Verify license status shows "Licensed"

---

## License Transfer

Licenses are bound to a specific machine. To transfer:

1. **Deactivate** on old machine:
   ```powershell
   cd C:\ScrapOS
   .\deactivate-license.ps1
   ```

2. **Contact support** with:
   - License key
   - Old machine ID
   - New machine ID

3. **Activate** on new machine

---

## Multi-Server Deployment

For multiple servers (load balancing, DR), you need:

- **Enterprise License**, OR
- **Additional server licenses**

Contact sales for volume pricing.

---

## License Renewal

Licenses are annual. Before expiry:

1. You'll receive reminder emails at 30, 14, and 7 days
2. Renew online or contact sales
3. Apply new license key

**Grace Period:** 14 days after expiry, application continues in read-only mode.

---

## Frequently Asked Questions

### Can I try before buying?
Yes! The 30-day trial includes all features.

### What if I need more trial time?
Contact sales@scrapos.ae for an extension.

### Is my data safe if license expires?
Yes. Data is never deleted. You can access it once licensed.

### Can I transfer my license to a new server?
Yes, contact support for transfer assistance.

### Do I need internet for license validation?
Initial activation requires internet. After activation, offline use is supported.

### What's included in support?
- Email support (all licenses)
- Phone support (Business+)
- 24/7 priority (Enterprise)
- Software updates
- Security patches

---

## Contact

**Sales:** sales@scrapos.ae
**Support:** support@scrapos.ae
**Website:** https://scrapos.ae
