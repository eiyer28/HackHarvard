# Twilio 2FA Setup Guide

## 1. Sign Up for Twilio

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free trial account (no credit card required)
3. Verify your email address

## 2. Get Your Twilio Credentials

After signing in:

1. Go to the [Twilio Console](https://console.twilio.com/)
2. Copy your **Account SID** and **Auth Token** from the dashboard

## 3. Create a Verify Service

1. Go to https://console.twilio.com/us1/develop/verify/services
2. Click **Create new Service**
3. Give it a name like "ProxyPay 2FA"
4. Click **Create**
5. Copy the **Service SID** (starts with `VA...`)

## 4. Verify Your Phone Number

Since you're on a free trial, you need to verify the phone number that will receive SMS:

1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click **Add a new Caller ID**
3. Enter your phone number in international format: `+1234567890`
4. Follow the verification process

## 5. Configure Your Backend

1. Navigate to `backend/api/` folder
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your credentials:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxx
   ```

4. Update `backend/api/app.py` line 69 and 73:
   ```python
   "phone": "+1234567890"  # Replace with YOUR verified phone number
   ```

## 6. Install Dependencies

```bash
cd backend/api
pip install -r requirements.txt
```

## 7. Test the 2FA Flow

1. Start the backend:
   ```bash
   python backend/api/app.py
   ```

2. Open `frontend/transaction-simulator.html` in your browser

3. Create a transaction with amount **> $100** (e.g., $150)

4. You should receive an SMS with a 6-digit code

5. Enter the code in the modal that appears

6. Transaction will be approved or denied based on location validation

## 8. Testing Scenarios

### Scenario 1: Low-value transaction (no 2FA)
- Amount: $25
- Expected: Immediate approval/denial based on location

### Scenario 2: High-value transaction (with 2FA)
- Amount: $150
- Expected: SMS sent, modal appears, enter code to complete

## Troubleshooting

**"Twilio not configured" error:**
- Make sure `.env` file exists in `backend/api/`
- Check that credentials are correct
- Restart the Flask server after updating `.env`

**"Failed to send verification code":**
- Make sure phone number is verified in Twilio console
- Check that phone number in `app.py` matches verified number
- Ensure phone number is in E.164 format: `+1234567890`

**Code not arriving:**
- Check your Twilio console for delivery status
- Make sure you're using a verified number (trial limitation)
- Wait ~30 seconds, sometimes SMS can be delayed

## Free Trial Limits

- **$15.25 in trial credit** (plenty for hackathon)
- **~1,900 SMS messages** possible
- Can only send to **verified phone numbers**
- No credit card required until you want to upgrade

## Cost

For your hackathon demo: **$0** (completely free)

Each SMS costs ~$0.0079, so even 50 test messages = $0.40
