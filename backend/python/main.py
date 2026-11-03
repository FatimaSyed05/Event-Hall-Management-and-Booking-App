from datetime import datetime
import json

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import urlparse, parse_qs
import os
import random
import string
import firebase_admin
from firebase_admin import credentials, auth
from fastapi.responses import RedirectResponse
from fastapi.responses import HTMLResponse
from firebase_admin import credentials, auth, firestore 
import time
from pydantic import BaseModel
import urllib.parse
from safepay_python.safepay import Safepay
from fastapi import Request

db = None
print(" Firestore Connected Successfully!")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

try:
    cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()  
    print("Firebase Admin SDK & Firestore Connected Successfully!")
except Exception as e:
    print(f"Firebase Admin Error: {e}")

class EmailRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

SENDER_EMAIL = "sairashehzadi46@gmail.com"       
SENDER_PASSWORD = "crgc hyzg rrsj iwco"         

def send_real_email(to_email: str, subject: str, body_text: str):
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg.attach(MIMEText(body_text, 'plain'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Email Error: {e}") 
        return False

@app.get("/")
async def root():
    return {"status": "Event Hall Python Backend is Running!"}

@app.post("/api/send-otp")
async def send_otp(req: EmailRequest):
    try:
        otp = ''.join(random.choices(string.digits, k=4))
        expires_at = int(time.time()) + 300
        db.collection("otps").document(f"emailChange_{req.email}").set({
            "otp": otp,
            "expires_at": expires_at,
            "created_at": int(time.time())
        })
        email_body = f"""
        Hello,

        Your Event Hall verification code is: {otp}

        This code will expire in 5 minutes.

        If you did not request this code, please ignore this email.

        Thank you,
        Event Hall Team
        """
        
        success = send_real_email(req.email, "Event Hall - Your Verification Code", email_body)
        if success:
            return {"message": "OTP sent successfully!", "otp": otp}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email.")
            
    except Exception as e:
        print(f"OTP Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# @app.post("/api/send-otp")
# async def send_otp(req: EmailRequest):
#     try:
#         otp = ''.join(random.choices(string.digits, k=4))
#         expires_at = int(time.time()) + 300
        
#         db.collection("otp_verifications").document(req.email).set({
#             "otp": otp,
#             "expires_at": expires_at,
#             "created_at": int(time.time())
#         })
        
#         email_body = f"""
#             Hello,

#             Your Event Hall verification code is: {otp}

#             This code will expire in 5 minutes.

#             If you did not request this code, please ignore this email.

#             Thank you,
#             Event Hall Team
#         """
        
#         success = send_real_email(req.email, "Event Hall - Your Verification Code", email_body)
#         if success:
#             return {"message": "OTP sent successfully!", "otp_for_testing": otp}
#         else:
#             raise HTTPException(status_code=500, detail="Failed to send email.")
            
#     except Exception as e:
#         print(f"OTP Error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/verify-otp")
# async def verify_otp(req: VerifyOTPRequest):
#     try:
#         doc_ref = db.collection("otp_verifications").document(req.email)
#         doc = doc_ref.get()
        
#         if not doc.exists:
#             raise HTTPException(status_code=400, detail="OTP request not found. Please request a new OTP.")
        
#         data = doc.to_dict()
#         current_time = int(time.time())
        
#         if current_time > data["expires_at"]:
#             doc_ref.delete() 
#             raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
#         if data["otp"] != req.otp:
#             raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
        
#         doc_ref.delete()
#         return {"message": "Email verified successfully!", "success": True}
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"Verification Error: {e}")
#         raise HTTPException(status_code=500, detail="Internal server error during verification.")

# @app.post("/api/forgot-password")
# async def forgot_password(req: EmailRequest):
#     try:
#         user = auth.get_user_by_email(req.email)       
#         action_code_settings = auth.ActionCodeSettings(
#             url='http://localhost', 
#             handle_code_in_app=True,
#         )
#         link = auth.generate_password_reset_link(req.email, action_code_settings)
        
#         parsed = urlparse(link)
#         oob_code = parse_qs(parsed.query).get('oobCode', [''])[0]       

#         # deep_link = f"https://thirty-paths-rush.loca.lt/reset-password?oobCode={oob_code}&email={req.email}"
        
#         deep_link = f"eventhall://reset-password?oobCode={oob_code}&email={req.email}"
#         email_body = f"""
#         <html>
#         <body style="font-family: Arial, sans-serif;">
#             <h2 style="color: #5B21B6;">Reset Your Password</h2>
#             <p>Hello,</p>
#             <p>We received a request to reset your password. Click the button below to reset it directly in the Event Hall app:</p>
#             <br>
#             <a href="{deep_link}" style="color: #0066CC; text-decoration: underline;">{deep_link}</a>
#         </body>
#         </html>
#         """
#         # email_body = f"""
#         # <html>
#         #   <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
#         #     <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
#         #       <h2 style="color: #5B21B6; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
#         #       <p style="color: #333333; font-size: 16px; line-height: 1.5;">Hello,</p>
#         #       <p style="color: #333333; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Click the button below to reset it directly in the Event Hall app:</p>
              
#         #       <div style="text-align: center; margin: 30px 0;">
#         #         <a href="{deep_link}" style="background-color: #5B21B6; color: #ffffff; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; font-weight: bold; border-radius: 8px; border: none; cursor: pointer;">
#         #           Reset Password
#         #         </a>
#         #       </div>
              
#         #       <p style="color: #666666; font-size: 14px; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
#         #       <p style="color: #0066CC; font-size: 12px; text-align: center; word-break: break-all;">{deep_link}</p>
#         #     </div>
#         #   </body>
#         # </html>
#         # """
        
#         success = send_real_email(req.email, "Event Hall - Reset Password", email_body)
#         if success:
#             return {"message": "Reset link sent successfully!"}
#         else:
#             raise HTTPException(status_code=500, detail="Failed to send email. Check terminal for SMTP error.")
           
#     except auth.UserNotFoundError:
#         raise HTTPException(status_code=404, detail="No account found with this email.")
#     except Exception as e:
#         print(f"Firebase Error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/forgot-password")
async def forgot_password(req: EmailRequest):
    try:
        print(f"Forgot password request for: {req.email}")
        user = auth.get_user_by_email(req.email)
        print(f"User found: {user.uid}")
        
        action_code_settings = auth.ActionCodeSettings(
            url='https://eventhallapp-e9546.firebaseapp.com/__/auth/handler',
            handle_code_in_app=False,
        )
        print(f"Generating password reset link...")
        link = auth.generate_password_reset_link(req.email, action_code_settings)
        print(f"Link generated: {link[:50]}...")
        
        email_body = f"""Hello,

    You requested to reset your password for your Event Hall account.

    Click the link below to reset your password:

    {link}

    This link will expire in 1 hour.

    If you didn't request this, please ignore this email.

    Event Hall Team
    """
        print(f"Sending custom password reset email...")
        success = send_real_email(req.email, "Event Hall - Reset Your Password", email_body)
        
        if success:
            print(f"Password reset email sent to {req.email}")
            return {
                "message": "Password reset email sent successfully! Check your inbox and spam folder.",
                "success": True
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP settings.")
           
    except auth.UserNotFoundError:
        print(f"User not found: {req.email}")
        raise HTTPException(status_code=404, detail="No account found with this email.")
    except Exception as e:
        print(f"Error: {e}")
        print(f"Error type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail=str(e))

# @app.get("/reset-password")
# async def reset_password_redirect(oobCode: str, email: str):
#     expo_deep_link = f"eventhall://reset-password?oobCode={oobCode}&email={email}"
    
#     html_content = f"""
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <meta charset="UTF-8">
#         <title>Opening Event Hall App...</title>
#         <script type="text/javascript">
#             window.location.href = "{expo_deep_link}";
#             setTimeout(function() {{
#                 window.location.href = "{expo_deep_link}";
#             }}, 100);
#         </script>
#     </head>
#     <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
#         <h2 style="color: #5B21B6;">Opening Event Hall App...</h2>
#         <p>If you are not redirected automatically, click the button below:</p>
#         <br>
#         <a href="{expo_deep_link}" style="background-color: #5B21B6; color: white; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
#             Open in App
#         </a>
#         <p style="margin-top: 20px; color: #666;">Or copy this link and paste in browser:</p>
#         <p style="color: #0066CC; word-break: break-all; font-size: 12px;">{expo_deep_link}</p>
#     </body>
#     </html>
#     """
    
#     return HTMLResponse(content=html_content)

class NotifyManagerRequest(BaseModel):
    email: str
    name: str
    approvalStatus: str = None 
    accountStatus: str = None

@app.post("/api/notify-user")
async def notify_user(req: NotifyManagerRequest):
    try:
        if req.approvalStatus == 'approved':
            subject = "Account Approved - Event Hall Management"
            body_text = f"""Dear {req.name},

            Your manager account registration has been approved by the admin. 
            You may now log in to the Event Hall application using your credentials.

            System Notification
            Event Hall Management
            """
        elif req.approvalStatus == 'rejected':
            subject = "Account Registration Update - Event Hall Management"
            body_text = f"""Dear {req.name},

            Your Manager account registration has been rejected. Please review your credentials and submit a new request.

            Best regards,
            Event Hall Admin Team
            """
        elif req.accountStatus == 'deleted':
            subject = "Account Deletion Notice - Event Hall Management"
            body_text = f"Dear {req.name},\n\nThis is to inform you that your Event Hall account has been deleted by the admin. You will no longer be able to access the application.\n\nEvent Hall Admin Team"

        else:
            raise HTTPException(status_code=400, detail="Invalid request")
        
        success = send_real_email(req.email, subject, body_text)        
        if success:
            return {"message": "Notification email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
            
    except Exception as e:
        print(f"Notification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

 # Payment
import os
import hmac
import hashlib
import requests
from dotenv import load_dotenv
from fastapi import Form
import nest_asyncio
nest_asyncio.apply()

load_dotenv()
SAFEPAY_API_KEY = os.getenv("SAFEPAY_API_KEY")
SAFEPAY_SECRET_KEY = os.getenv("SAFEPAY_SECRET_KEY")
SAFEPAY_BASE_URL = os.getenv("SAFEPAY_BASE_URL")
BACKEND_URL = os.getenv("BACKEND_URL")
SAFEPAY_WEBHOOK_SECRET = os.getenv("SAFEPAY_WEBHOOK_SECRET")
SAFEPAY_V1_SECRET = os.getenv("SAFEPAY_V1_SECRET")

safepay_client = Safepay({
    "environment": "sandbox",
    "apiKey": SAFEPAY_API_KEY,
    "v1Secret": SAFEPAY_V1_SECRET,
    "webhookSecret": SAFEPAY_WEBHOOK_SECRET
})

class PaymentRequest(BaseModel):
    bookingId: str
    amount: float
    frontendUrl: str = "" 

@app.post("/api/create-payment")
async def create_payment(payment: PaymentRequest):
    try:
        payment_response = safepay_client.set_payment_details({
            "amount": int(float(payment.amount)),
            "currency": "PKR",
        })
        
        if not payment_response.get('data'):
            print("Payment Creation Failed:", payment_response)
            raise HTTPException(status_code=400, detail="Failed to create payment")
        
        redirect_url = f"{BACKEND_URL}/api/payment-success"
        if payment.frontendUrl:
            redirect_url += f"?frontend_url={urllib.parse.quote(payment.frontendUrl)}"
        
        tracker_token = payment_response['data']['token']
        checkout_url = safepay_client.get_checkout_url({
            "beacon": tracker_token,
            "intent": "CYBERSOURCE",
            "cancelUrl": f"{BACKEND_URL}/api/payment-cancel",
            "orderId": str(payment.bookingId),
            "redirectUrl": redirect_url,
            "source": "hosted",
            "webhooks": True
        })
        
        print("CHECKOUT URL GENERATED:", checkout_url)
        return {"success": True, "checkoutUrl": checkout_url}
        
    except HTTPException:
        raise
    except Exception as e:
        print("Payment Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
# @app.post("/api/create-payment")
# async def create_payment(payment: PaymentRequest):
#     try:
#         headers = {
#             "Authorization": f"Bearer {SAFEPAY_API_KEY}", 
#             "Content-Type": "application/json"
#         }

#         session_payload = {
#             "merchant_api_key": SAFEPAY_API_KEY, 
#             "intent": "CYBERSOURCE",
#             "mode": "payment",
#             "entry_mode": "raw",
#             "currency": "PKR",
#             "amount": int(float(payment.amount) * 100), 
#             "metadata": {"order_id": str(payment.bookingId)},
#             "include_fees": False
#         }

#         session_res = requests.post(
#             f"{SAFEPAY_BASE_URL}/order/payments/v3/", 
#             json=session_payload, 
#             headers=headers
#         )
        
#         session_data = session_res.json() if session_res.text else {}
#         tracker_token = None
#         if isinstance(session_data, dict):
#             data_obj = session_data.get("data")
#             if isinstance(data_obj, dict):
#                 tracker_obj = data_obj.get("tracker")
#                 if isinstance(tracker_obj, dict):
#                     tracker_token = tracker_obj.get("token")

#         if not tracker_token:
#             print("Session Failed:", session_res.text)
#             raise HTTPException(status_code=400, detail="Failed to create payment session")

#         auth_res = requests.post(
#             f"{SAFEPAY_BASE_URL}/client/passport/v1/token",
#             headers=headers,
#             json={} 
#         )
        
#         auth_data = auth_res.json() if auth_res.text else {}
#         auth_token = auth_data.get("data") if isinstance(auth_data, dict) else None

#         if not auth_token:
#             print("Auth Token Failed:", auth_res.text)
#             raise HTTPException(status_code=400, detail=f"Authentication failed: {auth_res.text}")

#         checkout_url = (
#             f"{SAFEPAY_BASE_URL}/embedded/checkout?"
#             f"tracker={tracker_token}&"
#             f"tbt={auth_token}&"
#             f"environment=sandbox&"
#             # f"source=hosted&" 
#             f"source=mobile&"
#             f"redirect_url={BACKEND_URL}/api/payment-success&"
#             f"cancel_url={BACKEND_URL}/api/payment-cancel"
#         )

#         print("REAL CHECKOUT URL GENERATED:", checkout_url)
#         return {"success": True, "checkoutUrl": checkout_url}

#     except HTTPException:
#         raise
#     except Exception as e:
#         print(" Critical Error:", e)
#         raise HTTPException(status_code=500, detail=str(e))
    
# @app.post("/api/safepay-webhook")
# async def safepay_webhook(
#     tracker: str = Form(...),
#     signature: str = Form(...),
#     order_id: str = Form(...),
#     request: Request = None 
# ):
#     try:
#         body = await requests.request.json()
#         # body = json.loads(body_bytes)
#         signature = requests.requestuest.headers.get("x-sfpy-signature") or request.headers.get("X-Sfpy-Signature") or request.headers.get("X-SFPY-SIGNATURE")
        
#         is_valid = safepay_client.is_webhook_valid({
#             "x-sfpy-signature": signature
#         }, {
#             "data": body
#         })

#         if not is_valid:
#             print("Invalid webhook signature")
#             raise HTTPException(status_code=401, detail="Invalid signature")
        
#         order_id = body.get("tracker", body.get("orderId"))
       
#         booking_ref = db.collection("bookings").document(order_id)
#         if not booking_ref.get().exists:
#             booking_ref = db.collection("requests").document(order_id)
            
#         booking = booking_ref.get()

#         if booking.exists:
#             booking_data = booking.to_dict()
#             total_amount = float(booking_data.get("totalAmount", 0) or booking_data.get("totalCharges", 0))
#             current_status = str(booking_data.get("status", "pending")).lower()
#             manager_id = booking_data.get("managerId")
#             hall_name = booking_data.get("hallName", "Unknown Hall")
            
#             is_final_payment = current_status in ["confirmed", "paid", "advance_paid"]
#             if is_final_payment:
#                 paid_now = float(booking_data.get("remainingBalance", total_amount))
#             else:
#                 paid_now = float(booking_data.get("advanceRequired", 0) or booking_data.get("advancePayment", 0))
#                 if paid_now == 0:
#                     paid_now = total_amount 

#             admin_commission = paid_now * 0.05
#             manager_share = paid_now - admin_commission
#             updates = {
#                 "paidAt": firestore.SERVER_TIMESTAMP
#             }
            
#             if is_final_payment:
#                 updates["status"] = "completed"
#                 updates["remainingBalance"] = 0
#                 updates["paymentStatus"] = "fully_paid"
#                 updates["finalPaymentDate"] = firestore.SERVER_TIMESTAMP
#             else:
#                 updates["status"] = "confirmed"
#                 updates["advancePaid"] = paid_now
#                 updates["remainingBalance"] = total_amount - paid_now
#                 updates["paymentStatus"] = "advance_paid"

#             booking_ref.update(updates)
#             if manager_id:
#                 manager_ref = db.collection("users").document(manager_id)
#                 manager_ref.update({
#                     "walletBalance": firestore.Increment(manager_share)
#                 })

#             from datetime import datetime
            
#             db.collection("notifications").add({
#                 "type": "payments",
#                 "targetRole": "customer",
#                 "targetUserId": booking_data.get("customerId"),
#                 "bookingId": order_id,
#                 "title": "Booking Confirmed! 🎉" if not is_final_payment else "Booking Fully Completed! 🎊",
#                 "message": f"Your {'advance' if not is_final_payment else 'final'} payment of PKR {int(paid_now)} for {hall_name} has been received." + (" Your booking is now fully completed and ready for the event." if is_final_payment else " Your booking is now confirmed."),
#                 "status": "unread",
#                 "timestamp": datetime.utcnow()
#             })
            
#             if manager_id:
#                 db.collection("notifications").add({
#                     "type": "payments",
#                     "targetRole": "manager",
#                     "targetUserId": manager_id,
#                     "bookingId": order_id,
#                     "title": "Advance Payment Received!" if not is_final_payment else "Final Payment Received & Booking Completed! 🎊",
#                     "message": f"PKR {int(manager_share)} has been added to your wallet for {hall_name} ({'Final' if is_final_payment else 'Advance'} Payment).",
#                     "status": "unread",
#                     "timestamp": datetime.utcnow()
#                 })

#             admin_users = db.collection("users").where("role", "==", "admin").stream()
#             for admin_doc in admin_users:
#                 db.collection("notifications").add({
#                     "type": "payments",
#                     "targetRole": "admin",
#                     "targetUserId": admin_doc.id,
#                     "bookingId": order_id,
#                     "title": "New Commission Earned! 💼" if not is_final_payment else "Booking Completed - Final Commission! 💼",
#                     "message": f"{'Final' if is_final_payment else 'Advance'} payment at {hall_name}. Paid: PKR {int(paid_now)}. Your Commission (5%): PKR {int(admin_commission)}. Manager Share: PKR {int(manager_share)}.",
#                     "status": "unread",
#                     "timestamp": datetime.utcnow()
#                 })
            
#             print(f"PAYMENT SUCCESSFUL: Booking {order_id}. Type: {'FINAL' if is_final_payment else 'ADVANCE'}. Paid Now: {paid_now}")
#             return {"status": "success"}
#         else:
#             raise HTTPException(status_code=404, detail="Booking not found")

    # except Exception as e:
    #     print("Webhook Error:", e)
    #     raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/safepay-webhook")
async def safepay_webhook(request: Request):
    try:
        body_bytes = await request.body()
        body = json.loads(body_bytes)
        
        print("FULL WEBHOOK BODY:", body)  
        payload = body
        if "data" in body and isinstance(body["data"], dict):
            if "notification" in body["data"] and isinstance(body["data"]["notification"], dict):
                payload = body["data"]["notification"]
        
        print("PAYMENT PAYLOAD:", payload)
        
        order_id = None
        if "metadata" in payload and isinstance(payload["metadata"], dict):
            order_id = payload["metadata"].get("order_id") or payload["metadata"].get("orderId")
        
        if not order_id:
            order_id = payload.get("orderId") or payload.get("order_id") or payload.get("tracker")
        if not order_id and "metadata" in body and isinstance(body["metadata"], dict):
            order_id = body["metadata"].get("order_id") or body["metadata"].get("orderId")
        
        print(f"FINAL ORDER ID: {order_id}")
        
        if not order_id:
            raise HTTPException(status_code=400, detail="Order ID not found in webhook")
       
        booking_ref = db.collection("bookings").document(order_id)
        if not booking_ref.get().exists:
            booking_ref = db.collection("requests").document(order_id)
            
        booking = booking_ref.get()

        webhook_reference = payload.get("reference") or body.get("data", {}).get("notification", {}).get("reference")
        
        if webhook_reference:
            existing = db.collection("processed_webhooks").document(webhook_reference).get()
            if existing.exists:
                print(f"Duplicate webhook (reference: {webhook_reference}), skipping")
                return {"status": "duplicate_ignored"}
            
            db.collection("processed_webhooks").document(webhook_reference).set({
                "processed_at": firestore.SERVER_TIMESTAMP,
                "order_id": order_id,
                "amount": payload.get("amount")
            })
        if booking.exists:
            booking_data = booking.to_dict()
            total_amount = float(booking_data.get("totalAmount", 0) or booking_data.get("totalCharges", 0))
            current_status = str(booking_data.get("status", "pending")).lower()
            manager_id = booking_data.get("managerId")
            hall_name = booking_data.get("hallName", "Unknown Hall")
            
            is_final_payment = current_status in ["confirmed", "paid", "advance_paid"]
            if is_final_payment:
                paid_now = float(booking_data.get("remainingBalance", total_amount))
            else:
                paid_now = float(booking_data.get("advanceRequired", 0) or booking_data.get("advancePayment", 0))
                if paid_now == 0:
                    paid_now = total_amount 

            # admin_commission = paid_now * 0.05
            # manager_share = paid_now - admin_commission
            commission_rate = booking_data.get("commissionRate", 5)
            admin_commission = paid_now * (commission_rate / 100)
            manager_share = paid_now - admin_commission
            updates = {
                "paidAt": firestore.SERVER_TIMESTAMP
            }
            
            if is_final_payment:
                updates["status"] = "completed"
                updates["remainingBalance"] = 0
                updates["paymentStatus"] = "fully_paid"
                updates["finalPaymentDate"] = firestore.SERVER_TIMESTAMP
            else:
                updates["status"] = "confirmed"
                updates["advancePaid"] = paid_now
                updates["remainingBalance"] = total_amount - paid_now
                updates["paymentStatus"] = "advance_paid"

            booking_ref.update(updates)
            if manager_id:
                manager_ref = db.collection("users").document(manager_id)
                manager_ref.update({
                    "walletBalance": firestore.Increment(manager_share)
                })
                original_request_id = booking_data.get("originalRequestId")
            if original_request_id:
                try:
                    request_ref = db.collection("requests").document(original_request_id)
                    if request_ref.get().exists:
                        request_ref.update({
                            "bookingId": order_id,
                            "paymentConfirmedAt": firestore.SERVER_TIMESTAMP
                        })
                        print(f"Original request deleted: {original_request_id}")
                except Exception as delete_error:
                    print(f"Request deletion failed (non-critical): {delete_error}")

            from datetime import datetime    

            if not is_final_payment:
                try:
                    hall_id = booking_data.get("hallId")
                    event_date = booking_data.get("date")
                    time_slot = booking_data.get("timeSlot")
                    current_customer_id = booking_data.get("customerId")
                    
                    if hall_id and event_date and time_slot:
                        conflicting_query = db.collection("requests") \
                            .where("hallId", "==", hall_id) \
                            .where("date", "==", event_date) \
                            .where("timeSlot", "==", time_slot) \
                            .where("status", "==", "accepted")
                        
                        conflicting_requests = list(conflicting_query.stream())
                        print(f"\nFound {len(conflicting_requests)} conflicting request(s)")
                        
                        rejected_count = 0
                        for conflict in conflicting_requests:
                            conflict_data = conflict.to_dict()
                            conflict_customer_id = conflict_data.get("customerId")
                            # conflict_customer_name = conflict_data.get("customerName", "Unknown")
         
                            if conflict.id == original_request_id:
                                continue
                            
                            if conflict_customer_id == current_customer_id:
                                continue
                                                
                            conflict.reference.update({
                                "status": "rejected",
                                "rejectionReason": "Time slot already booked by another customer",
                                "autoRejected": True,
                                "rejectedAt": firestore.SERVER_TIMESTAMP
                            })                            
                            try:
                                bookings_query = db.collection("bookings") \
                                    .where("originalRequestId", "==", conflict.id)
                                
                                related_bookings = list(bookings_query.stream())
                                
                                if related_bookings:
                                    for related_booking_doc in related_bookings:
                                        related_booking_data = related_booking_doc.to_dict()
                                        if related_booking_data.get("status") == "pending":
                                            related_booking_doc.reference.delete()
                            except Exception as booking_delete_error:
                                print(f"Booking deletion error (non-critical): {booking_delete_error}")

                            notification_data = {
                                "type": "auto_rejection",
                                "targetRole": "customer",
                                "targetUserId": conflict_customer_id,
                                "bookingId": conflict.id,
                                "requestId": conflict.id,
                                "hallName": hall_name,
                                "title": "Request Auto-Rejected",
                                "message": f"Your request for {hall_name} on {event_date} at {time_slot} was auto-rejected as another customer confirmed the booking first.",
                                "detailedMessage": (
                                    f"Assalam-o-Alaikum!\n\n"
                                    f"We regret to inform you that your booking request for {hall_name} on {event_date} ({time_slot}) could not be confirmed as another customer has already paid the advance and secured this time slot.\n\n"
                                    f"📋 Request Details:\n"
                                    f"• Hall: {hall_name}\n"
                                    f"• Date: {event_date}\n"
                                    f"• Time: {time_slot}\n\n"
                                    f"Please try booking for another date or explore our other available halls.\n\n"
                                    f"We apologize for the inconvenience.\n\n"
                                    f"Best Regards,\n{hall_name}"
                                ),
                                "status": "unread",
                                "action": "request-details",
                                "timestamp": datetime.utcnow()
                            }
                            
                            notification_ref = db.collection("notifications").add(notification_data)
                            print(f"Notification sent successfully! ID: {notification_ref[1].id}")
                            send_fcm_push(
                                user_id=conflict_customer_id,
                                title="Request Auto-Rejected ",
                                body=f"Your request for {hall_name} on {event_date} was auto-rejected. Another customer confirmed first.",
                                data={"action": "request-details", "requestId": conflict.id, "type": "auto_rejection"}
                            )
                            rejected_count += 1
                            print(f"Auto-rejected conflicting request: {conflict.id}")
                        
                        if rejected_count > 0:
                            print(f"Total auto-rejected: {rejected_count} request(s) for {hall_name} on {event_date} at {time_slot}")
                
                except Exception as conflict_error:
                    print(f"Conflict auto-rejection error (non-critical): {conflict_error}")

            # from datetime import datetime
            
            customer_detailed = (
                f"Assalam-o-Alaikum {booking_data.get('customerName', 'Customer')}!\n\n"
                f"Great news! Your {'advance' if not is_final_payment else 'final'} payment has been successfully received.\n\n"
                f"📋 Payment Details:\n"
                f"• Booking ID: {order_id}\n"
                f"• Hall: {hall_name}\n"
                f"• Event Date: {booking_data.get('date', 'N/A')}\n"
                f"• Payment Amount: PKR {int(paid_now)}\n"
                f"• Payment Type: {'Advance' if not is_final_payment else 'Final'}\n"
                f"• Transaction ID: {order_id[:8].upper()}\n\n"
                f"{'Your booking is now fully confirmed and ready for the event!' if is_final_payment else 'Your booking is confirmed. Please pay the remaining balance before the event.'}\n\n"
                f"Thank you for choosing {hall_name}!\n\n"
                f"Best Regards,\n{hall_name}"
            )
           
            db.collection("notifications").add({
                "type": "payments",
                "targetRole": "customer",
                "targetUserId": booking_data.get("customerId"),
                "bookingId": order_id,
                "senderName": hall_name,  
                "senderId": booking_data.get("managerId", ""),
                "title": "Booking Confirmed! 🎉" if not is_final_payment else "Booking Fully Completed! 🎊",
                "message": f"Your {'advance' if not is_final_payment else 'final'} payment of PKR {int(paid_now)} for {hall_name} has been received.",
                "detailedMessage": customer_detailed, 
                "status": "unread",
                "timestamp": datetime.utcnow()
            })
            send_fcm_push(
                user_id=booking_data.get("customerId"),
                title="Booking Confirmed! 🎉" if not is_final_payment else "Booking Fully Completed! 🎊",
                body=f"Your {'advance' if not is_final_payment else 'final'} payment of PKR {int(paid_now)} for {hall_name} has been received.",
                data={"action": "booking-details", "bookingId": order_id, "type": "payments"}
            )
                        
            if manager_id:
                detailed_msg = (
                    f"Assalam-o-Alaikum!\n\n"
                    f"A new {'advance' if not is_final_payment else 'final'} payment has been received for {hall_name}.\n\n"
                    f"Event Details:\n"
                    f"• Hall: {hall_name}\n"
                    f"• Date: {booking_data.get('date', 'N/A')}\n"
                    f"• Time: {booking_data.get('timeSlot', 'N/A')}\n"
                    f"• Function: {booking_data.get('functionType', 'N/A')}\n"
                    f"• Customer: {booking_data.get('customerName', 'N/A')}\n\n"
                    f"💰 Payment Received: PKR {int(paid_now)}\n"
                    f"💼 Admin Commission ({commission_rate}%): PKR {int(admin_commission)}\n"
                    f"💵 Added to Your Wallet: PKR {int(manager_share)}\n\n"
                    f"You can check the updated balance in your wallet.\n\n"
                    f"Best Regards,\nEvent Hall"
                )
                db.collection("notifications").add({
                    "type": "payments",
                    "targetRole": "manager",
                    "targetUserId": manager_id,
                    "bookingId": order_id,
                    "senderName": booking_data.get("customerName", "Customer"),  
                    "senderId": booking_data.get("customerId", ""),
                    "hallName": hall_name,
                    "title": "Advance Payment Received!" if not is_final_payment else "Final Payment Received & Booking Completed! 🎊",
                    "message": f"PKR {int(manager_share)} has been added to your wallet for {hall_name} ({'Final' if is_final_payment else 'Advance'} Payment).",
                    "detailedMessage": detailed_msg,
                    "status": "unread",
                    "timestamp": datetime.utcnow()
                })
                send_fcm_push(
                    user_id=manager_id,
                    title="Advance Payment Received! 💰" if not is_final_payment else "Final Payment Received! 🎊",
                    body=f"PKR {int(manager_share)} added to your wallet for {hall_name}.",
                    data={"action": "booking-details", "bookingId": order_id, "type": "payments"}
                )
            # if manager_id:
            #     db.collection("notifications").add({
            #         "type": "payments",
            #         "targetRole": "manager",
            #         "targetUserId": manager_id,
            #         "bookingId": order_id,
            #         "senderName": booking_data.get("customerName", "Customer"), 
            #         "hallName": hall_name,
            #         "title": "Advance Payment Received!" if not is_final_payment else "Final Payment Received & Booking Completed! 🎊",
            #         "message": f"PKR {int(manager_share)} has been added to your wallet for {hall_name} ({'Final' if is_final_payment else 'Advance'} Payment).",
            #         "detailedMessage": f"{'Final' if is_final_payment else 'Advance'} payment received!\n\nCustomer: {booking_data.get('customerName', 'N/A')}\nHall: {hall_name}\nAmount Paid: PKR {int(paid_now)}\nYour Earnings: PKR {int(manager_share)}\n\nBooking is now {'completed' if is_final_payment else 'confirmed'}.",
            #         "status": "unread",
            #         "timestamp": datetime.utcnow()
            #     })

            admin_users = db.collection("users").where("role", "==", "admin").stream()
            admin_users_list = list(db.collection("users").where("role", "==", "admin").stream())

            for admin_doc in admin_users_list:
                db.collection("notifications").add({
                    "type": "payments",
                    "targetRole": "admin",
                    "targetUserId": admin_doc.id,         
                    "bookingId": order_id,
                    "senderName": booking_data.get("customerName", "Customer"),
                    "senderId": booking_data.get("customerId", ""),
                    "customerName": booking_data.get("customerName", "Customer"),
                    "customerId": booking_data.get("customerId", ""),
                    "hallName": hall_name,
                    "action": "booking-details",          
                    "title": "New Commission Earned! 💼" if not is_final_payment else "Booking Completed - Final Commission! 💼",
                    "message": f"{'Final' if is_final_payment else 'Advance'} payment at {hall_name}. Paid: PKR {int(paid_now)}. Your Commission ({commission_rate}%): PKR {int(admin_commission)}. Manager Share: PKR {int(manager_share)}.",
                    "status": "unread",
                    "timestamp": datetime.utcnow()
                })

            admin_ids = [d.id for d in admin_users_list]
            send_fcm_push_to_many(
                user_ids=admin_ids,
                title="New Commission Earned! 💼",
                body=f"{'Final' if is_final_payment else 'Advance'} payment at {hall_name}. Commission: PKR {int(admin_commission)}.",
                data={"action": "booking-details", "bookingId": order_id, "type": "payments"}
            )
                        
            print(f"PAYMENT SUCCESSFUL: Booking {order_id}. Type: {'FINAL' if is_final_payment else 'ADVANCE'}. Paid Now: {paid_now}")
            return {"status": "success"}
        else:
            raise HTTPException(status_code=404, detail="Booking not found")

    except Exception as e:
        print("Webhook Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
        
class CancelBookingRequest(BaseModel):
    bookingId: str
    reason: str = "Customer requested cancellation"

@app.post("/api/cancel-booking")
async def cancel_booking(req: CancelBookingRequest):
    try:
        booking_ref = db.collection("bookings").document(req.bookingId)
        booking = booking_ref.get()
        
        if not booking.exists:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.to_dict()
        manager_id = booking_data.get("managerId")
        customer_id = booking_data.get("customerId")
        hall_name = booking_data.get("hallName", "Unknown Hall")
        paid_amount = float(booking_data.get("advancePaid", 0) or booking_data.get("advancePayment", 0))
        
        customer_name = "Unknown Customer"
        if customer_id:
            customer_doc = db.collection("users").document(customer_id).get()
            if customer_doc.exists:
                c_data = customer_doc.to_dict()
                f_name = c_data.get("firstName", "")
                l_name = c_data.get("lastName", "")
                customer_name = f"{f_name} {l_name}".strip()
                if not customer_name:
                    customer_name = c_data.get("name", "Unknown Customer")

        event_date = booking_data.get("date", booking_data.get("eventDate", "N/A"))
        event_time = booking_data.get("timeSlot", booking_data.get("eventTime", "N/A"))
        
        from datetime import datetime
        booking_ref.update({
            "status": "cancelled",
            "refundStatus": "awaiting_refund",
            "cancelledAt": firestore.SERVER_TIMESTAMP,
            "cancellationReason": req.reason,
            "refundAmount": paid_amount
        })
        
        customer_cancel_detailed = (
            f"Assalam-o-Alaikum {customer_name}!\n\n"
            f"Your booking has been successfully cancelled.\n\n"
            f"📋 Cancellation Details:\n"
            f"• Booking ID: {req.bookingId}\n"
            f"• Hall: {hall_name}\n"
            f"• Event Date: {event_date}\n"
            f"• Event Time: {event_time}\n"
            f"• Refund Amount: PKR {int(paid_amount)}\n"
            f"• Reason: {req.reason}\n\n"
            f"Your refund is currently being processed by the admin. You will receive the amount in your account within 3-5 business days.\n\n"
            f"We apologize for any inconvenience.\n\n"
            f"Best Regards,\n{hall_name}"
        )
        
        db.collection("notifications").add({
            "type": "cancellations",
            "senderName": hall_name, 
            "senderId": manager_id or "",
            "targetRole": "customer",
            "targetUserId": customer_id,
            "bookingId": req.bookingId,
            "title": "Booking Cancelled - Refund Pending ⏳",
            "message": f"Your booking at {hall_name} for {event_date} ({event_time}) has been cancelled. Your refund of PKR {int(paid_amount)} is awaiting admin approval.",
            "detailedMessage": customer_cancel_detailed, 
            "status": "unread",
            "timestamp": datetime.utcnow()
        })
        send_fcm_push(
            user_id=customer_id,
            title="Booking Cancelled",
            body=f"Your booking at {hall_name} for {event_date} has been cancelled. Refund PKR {int(paid_amount)} pending.",
            data={"action": "booking-details", "bookingId": req.bookingId, "type": "cancellations"}
        )
        
        if manager_id:
            manager_cancel_detailed = (
                f"Assalam-o-Alaikum!\n\n"
                f"A booking has been cancelled by the customer.\n\n"
                f"📋 Booking Details:\n"
                f"• Booking ID: {req.bookingId}\n"
                f"• Hall: {hall_name}\n"
                f"• Customer: {customer_name}\n"
                f"• Event Date: {event_date}\n"
                f"• Event Time: {event_time}\n"
                f"• Refund Amount: PKR {int(paid_amount)}\n"
                f"• Reason: {req.reason}\n\n"
                f"The refund is awaiting admin approval.\n\n"
                f"Best Regards,\nEvent Hall"
            )
            
            db.collection("notifications").add({
                "type": "bookings",
                "senderName": customer_name,  
                "senderId": customer_id,
                "hallName": hall_name,
                "targetRole": "manager",
                "targetUserId": manager_id,
                "bookingId": booking_ref.id,       
                "title": "Booking Cancelled",
                "message": f"{customer_name} has cancelled the booking for {hall_name}.",
                "detailedMessage": manager_cancel_detailed, 
                "status": "unread",
                "timestamp": datetime.utcnow()
            })
            send_fcm_push(
                user_id=manager_id,
                title="Booking Cancelled ",
                body=f"{customer_name} cancelled booking for {hall_name}.",
                data={"action": "booking-details", "bookingId": req.bookingId, "type": "cancellations"}
            )
        
        admin_users = db.collection("users").where("role", "==", "admin").stream()
        for admin_doc in admin_users:
            db.collection("notifications").add({
                "type": "bookings",
                "senderName": customer_name,  
                "targetRole": "admin",
                "targetUserId": admin_doc.id,
                "senderName": customer_name,
                "senderId": customer_id,
                "bookingId": req.bookingId,
                "title": "Refund Approval Required",
                "message": f"{customer_name} cancelled booking at {hall_name} for {event_date} ({event_time}). Refund of PKR {int(paid_amount)} requires your approval.",
                "action": "booking-details",
                "status": "unread",
                "timestamp": datetime.utcnow()
            })
            admin_ids = [admin_doc.id for admin_doc in admin_users]
            send_fcm_push_to_many(
                user_ids=admin_ids,
                title="Refund Approval Required",
                body=f"{customer_name} cancelled booking at {hall_name}. Refund PKR {int(paid_amount)} needs approval.",
                data={"action": "booking-details", "bookingId": req.bookingId, "type": "cancellations"}
            )
        
        print(f"BOOKING CANCELLED: {req.bookingId} by {customer_name}. Refund Amount: {paid_amount}")
        return {"success": True, "message": "Booking cancelled. Refund is awaiting admin approval."}
        
    except HTTPException:
        raise
    except Exception as e:
        print("Cancel Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
class RefundRequest(BaseModel):
    bookingId: str
 
@app.post("/api/process-refund")
async def process_refund(req: RefundRequest):
    try:
        booking_ref = db.collection("bookings").document(req.bookingId)
        booking = booking_ref.get()
        
        if not booking.exists:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking_data = booking.to_dict()
        customer_id = booking_data.get("customerId")
        manager_id = booking_data.get("managerId")
        hall_name = booking_data.get("hallName", "Unknown Hall")
        event_date = booking_data.get("date", "N/A")
        event_time = booking_data.get("timeSlot", "N/A")
        
        customer_name = "Customer"
        if customer_id:
            customer_doc = db.collection("users").document(customer_id).get()
            if customer_doc.exists:
                customer_name = customer_doc.to_dict().get("name", "Customer")
        
        manager_name = "Manager"
        if manager_id:
            manager_doc = db.collection("users").document(manager_id).get()
            if manager_doc.exists:
                manager_name = manager_doc.to_dict().get("name", "Manager")
        refund_amount = float(booking_data.get("advancePaid", 0) or 0)
        commission_rate = booking_data.get("commissionRate", 5)
        manager_deduction = refund_amount * ((100 - commission_rate) / 100)
        admin_commission_refund = refund_amount * (commission_rate / 100)     
        manager_deduction = refund_amount * 0.95
        admin_commission_refund = refund_amount * 0.05  
        
        from datetime import datetime
        booking_ref.update({
            "status": "refunded",
            "paymentStatus": "refunded", 
            "refundStatus": "completed",
            "refundedAt": firestore.SERVER_TIMESTAMP,
            "refundTransactionId": f"REF-{req.bookingId[-8:].upper()}",
            "refundProcessedBy": "admin",
        })
        
        if manager_id:
            manager_ref = db.collection("users").document(manager_id)
            manager_ref.update({
                "walletBalance": firestore.Increment(-manager_deduction)
            })
            print(f" Manager wallet deducted: PKR {int(manager_deduction)} from {manager_name}")
        
        if customer_id:
            customer_detailed = (
                f"Assalam-o-Alaikum {customer_name}!\n\n"
                f"Great news! Your refund has been successfully processed.\n\n"
                f"📋 Refund Details:\n"
                f"• Booking ID: {req.bookingId}\n"
                f"• Hall: {hall_name}\n"
                f"• Event Date: {event_date}\n"
                f"• Refund Amount: PKR {int(refund_amount)}\n"
                f"• Transaction ID: REF-{req.bookingId[-8:].upper()}\n\n"
                f"The amount has been credited to your wallet and will be transferred to your account within 3-5 business days.\n\n"
                f"Thank you for using Event Hall!\n\n"
                f"Best Regards,\nAdmin"
            )
            db.collection("notifications").add({
                "type": "refunds",
                "senderName": "EventHallApp",
                "senderId": "EventHallApp",
                "targetRole": "customer",
                "targetUserId": customer_id,
                "bookingId": req.bookingId,
                "hallName": hall_name,
                "title": "Refund Successful! 💰",
                "message": f"PKR {int(refund_amount)} has been refunded for {hall_name} booking.",
                "detailedMessage": customer_detailed,
                "action": "booking-details",
                "status": "unread",
                "timestamp": datetime.utcnow()
            })
            send_fcm_push(
                user_id=customer_id,
                title="Refund Successful!",
                body=f"PKR {int(refund_amount)} refunded for {hall_name} booking.",
                data={"action": "booking-details", "bookingId": req.bookingId, "type": "refunds"}
            )
        
        if manager_id:
            manager_detailed = (
                f"Assalam-o-Alaikum {manager_name}!\n\n"
                f"A booking refund has been processed by admin.\n\n"
                f"📋 Booking Details:\n"
                f"• Booking ID: {req.bookingId}\n"
                f"• Hall: {hall_name}\n"
                f"• Customer: {customer_name}\n"
                f"• Event Date: {event_date}\n\n"
                f"💰 Financial Breakdown:\n"
                f"• Total Refund to Customer: PKR {int(refund_amount)}\n"
                f"• Deducted from Your Wallet ({100 - commission_rate}%): PKR {int(manager_deduction)}\n"
                f"• Admin Commission Refund ({commission_rate}%): PKR {int(admin_commission_refund)}\n\n"
                f"Your wallet balance has been updated accordingly.\n\n"
                f"Best Regards,\nAdmin"
            )
            db.collection("notifications").add({
                "type": "refunds",
                "senderName": "EventHallApp",
                "senderId": "EventHallApp",
                "targetRole": "manager",
                "targetUserId": manager_id,
                "bookingId": req.bookingId,
                "hallName": hall_name,
                "customerName": customer_name,
                "title": "Refund Processed - Wallet Updated ⚠️",
                "message": f"Refund of PKR {int(refund_amount)} for {hall_name} has been processed. PKR {int(manager_deduction)} deducted from your wallet.",
                "detailedMessage": manager_detailed,
                "action": "booking-details",
                "status": "unread",
                "timestamp": datetime.utcnow()
            })
            send_fcm_push(
                user_id=manager_id,
                title="Refund Processed - Wallet Updated",
                body=f"Refund PKR {int(refund_amount)} processed. PKR {int(manager_deduction)} deducted from wallet.",
                data={"action": "booking-details", "bookingId": req.bookingId, "type": "refunds"}
            )
        
        admin_users = db.collection("users").where("role", "==", "admin").stream()
        for admin_doc in admin_users:
            admin_detailed = (
                f"Refund Successfully Processed\n\n"
                f"📋 Details:\n"
                f"• Booking ID: {req.bookingId}\n"
                f"• Hall: {hall_name}\n"
                f"• Customer: {customer_name}\n"
                f"• Manager: {manager_name}\n"
                f"• Event Date: {event_date}\n\n"
                f"💰 Financial Summary:\n"
                f"• Refunded to Customer: PKR {int(refund_amount)}\n"
                f"• Deducted from Manager ({100 - commission_rate}%): PKR {int(manager_deduction)}\n"
                f"• Your Commission Refund ({commission_rate}%): PKR {int(admin_commission_refund)}\n\n"
                f"Transaction ID: REF-{req.bookingId[-8:].upper()}"
            )
            db.collection("notifications").add({
                "type": "refunds",
                "senderName": "EvettHallApp",
                "senderId": "EventHallApp",
                "targetRole": "admin",
                "targetUserId": admin_doc.id,
                "bookingId": req.bookingId,
                "hallName": hall_name,
                "title": "Refund Processed Successfully",
                "message": f"Refund of PKR {int(refund_amount)} for {hall_name} has been completed.",
                "detailedMessage": admin_detailed,
                "action": "booking-details",
                "status": "unread",
                "timestamp": datetime.utcnow()
            })
            send_fcm_push(
                user_id=admin_doc.id,
                title="Refund Processed Successfully ",
                body=f"Refund PKR {int(refund_amount)} for {hall_name} completed.",
                data={"action": "booking-details", "bookingId": req.bookingId, "type": "refunds"}
            )
        
        print(f"   REFUND PROCESSED: {req.bookingId}")
        print(f"   Customer: {customer_name} (+{int(refund_amount)} to wallet)")
        print(f"   Manager: {manager_name} (-{int(manager_deduction)} from wallet)")
        print(f"   Admin: -{int(admin_commission_refund)} commission refund")
        
        return {
            "success": True, 
            "message": "Refund processed successfully",
            "refundAmount": refund_amount,
            "managerDeduction": manager_deduction
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("Refund Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/payment-success")
async def payment_success(order_id: str = "", frontend_url: str = ""):
    if frontend_url:
        web_success_url = f"{frontend_url}/(customerapp)/payment?bookingId={order_id}&status=success"
        return RedirectResponse(url=web_success_url)
    else:
        return HTMLResponse("""
            <html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #10B981;">Payment Successful!</h2>
            <p>Redirecting to app...</p>
            <script>setTimeout(() => window.location.href = "eventhall://payment-success", 2000);</script>
            </body></html>
        """)
    
@app.get("/api/payment-cancel")
async def payment_cancel():
    return HTMLResponse("""
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2 style="color: #EF4444;">Payment Cancelled</h2>
        <p>Redirecting to app...</p>
        <script>setTimeout(() => window.location.href = "eventhall://payment-cancel", 2000);</script>
        </body></html>
    """)   

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
from io import BytesIO
from fastapi.responses import StreamingResponse
import io
from google.cloud.firestore import FieldFilter

class ReportRequest(BaseModel):
    startDate: str
    endDate: str
    category: str 
    managerId: str  
    hallId: str  

@app.post("/api/generate-report")
async def generate_report(req: ReportRequest):
    try:
        print(f"Generating report: {req.category}, {req.startDate} to {req.endDate}")
        
        from datetime import datetime
        start_date = datetime.strptime(req.startDate, "%Y-%m-%d")
        end_date = datetime.strptime(req.endDate, "%Y-%m-%d")
        end_date = end_date.replace(hour=23, minute=59, second=59)
        
        bookings_data = []
        requests_data = []
        total_revenue = 0
        total_commission = 0
        completed_bookings = 0
        pending_bookings = 0
        accepted_requests = 0
        rejected_requests = 0
        pending_requests = 0
        
        bookings_ref = db.collection("bookings")
        if req.managerId != "all":
            bookings_ref = bookings_ref.where(filter=FieldFilter("managerId", "==", req.managerId))
        if req.hallId != "all":
            bookings_ref = bookings_ref.where(filter=FieldFilter("hallId", "==", req.hallId))   
        
        bookings = bookings_ref.stream()
        for booking in bookings:
            data = booking.to_dict()
            booking_date_str = data.get("date", "")
            
            try:
                booking_date = datetime.strptime(booking_date_str, "%d %B %Y")
                if booking_date < start_date or booking_date > end_date:
                    continue
            except:
                try:
                    booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d")
                    if booking_date < start_date or booking_date > end_date:
                        continue
                except:
                    continue
            
            if req.category != "All Categories" and req.category != "Bookings":
                continue
            
            amount = float(data.get("advancePaid", 0) or data.get("totalAmount", 0))
            commission_rate = float(data.get("commissionRate", 5))
            commission = amount * (commission_rate / 100)
            status = data.get("status", "pending")
            
            bookings_data.append({
                "id": booking.id,
                "customerName": data.get("customerName", "N/A"),
                "hallName": data.get("hallName", "N/A"),
                "managerName": data.get("managerName", "N/A"),
                "date": booking_date_str,
                "timeSlot": data.get("timeSlot", "N/A"),
                "functionType": data.get("functionType", "N/A"),
                "amount": amount,
                "commission": commission,
                "status": status
            })
            
            total_revenue += amount
            total_commission += commission
            
            if status in ["completed", "confirmed", "paid"]:
                completed_bookings += 1
            else:
                pending_bookings += 1
        
        if req.category == "All Categories" or req.category == "Requests":
            requests_ref = db.collection("requests")
            if req.managerId != "all":
                requests_ref = requests_ref.where("managerId", "==", req.managerId)
            if req.hallId != "all":
                requests_ref = requests_ref.where("hallId", "==", req.hallId)
            
            requests_list = requests_ref.stream()
            
            for request in requests_list:
                data = request.to_dict()
                request_date_str = data.get("date", "")
                
                try:
                    request_date = datetime.strptime(request_date_str, "%d %B %Y")
                    if request_date < start_date or request_date > end_date:
                        continue
                except:
                    try:
                        request_date = datetime.strptime(request_date_str, "%Y-%m-%d")
                        if request_date < start_date or request_date > end_date:
                            continue
                    except:
                        continue
                
                status = data.get("status", "pending")
                
                requests_data.append({
                    "id": request.id,
                    "customerName": data.get("customerName", "N/A"),
                    "hallName": data.get("hallName", "N/A"),
                    "managerName": data.get("managerName", "N/A"),
                    "date": request_date_str,
                    "functionType": data.get("functionType", "N/A"),
                    "status": status
                })
                
                if status == "accepted":
                    accepted_requests += 1
                elif status == "rejected":
                    rejected_requests += 1
                else:
                    pending_requests += 1
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#5B21B6'),
            spaceAfter=12,
            alignment=1  # Center
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#111827'),
            spaceAfter=10,
            spaceBefore=10
        )
        
        elements.append(Paragraph("Event Hall Management Report", title_style))
        elements.append(Spacer(1, 0.2*inch))
        
        info_text = f"""
        <b>Report Period:</b> {req.startDate} to {req.endDate}<br/>
        <b>Category:</b> {req.category}<br/>
        <b>Generated:</b> {datetime.now().strftime("%d %B %Y, %I:%M %p")}
        """
        elements.append(Paragraph(info_text, styles['Normal']))
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Summary", heading_style))
        
        summary_data = [
            ["Metric", "Count"],
            ["Total Bookings", str(len(bookings_data))],
            ["Completed Bookings", str(completed_bookings)],
            ["Pending Bookings", str(pending_bookings)],
            ["Total Requests", str(len(requests_data))],
            ["Accepted Requests", str(accepted_requests)],
            ["Rejected Requests", str(rejected_requests)],
            ["Pending Requests", str(pending_requests)]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#5B21B6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F9FAFB')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        elements.append(Paragraph("Financial Summary", heading_style))
        
        financial_data = [
            ["Description", "Amount (PKR)"],
            ["Total Revenue", f"{total_revenue:,.0f}"],
            ["Admin Commission Earned", f"{total_commission:,.0f}"],
            ["Manager Share", f"{(total_revenue - total_commission):,.0f}"]
        ]
        
        financial_table = Table(financial_data, colWidths=[3*inch, 2*inch])
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#5B21B6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        
        elements.append(financial_table)
        elements.append(Spacer(1, 0.3*inch))       

        if bookings_data and (req.category == "All Categories" or req.category == "Bookings"):
            elements.append(PageBreak())
            elements.append(Paragraph("Detailed Bookings", heading_style))
            
            booking_table_data = [
                ["Customer", "Phone", "Hall", "Date", "Amount", "Commission", "Status"]
            ]
            
            for booking in bookings_data[:50]:  
                phone_num = str(booking.get("customerPhone", booking.get("phone", "N/A")))
                
                booking_table_data.append([
                    booking["customerName"][:20],
                    phone_num[:15],             
                    booking["hallName"][:15],
                    booking["date"][:10],
                    f"{booking['amount']:,.0f}",
                    f"{booking['commission']:,.0f}",
                    booking["status"].capitalize()
                ])
            
            booking_table = Table(booking_table_data, colWidths=[
                1.1*inch,  # Customer
                1.0*inch,  # Phone (Naya add hua)
                1.0*inch,  # Hall
                0.8*inch,  # Date
                0.7*inch,  # Amount
                0.7*inch,  # Commission
                0.7*inch   # Status
            ])
            
            booking_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#5B21B6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')])
            ]))
            
            elements.append(booking_table)
            
            if len(bookings_data) > 50:
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(f"<i>* Showing first 50 of {len(bookings_data)} records</i>", styles['Normal']))
        
        if requests_data and (req.category == "All Categories" or req.category == "Requests"):
            elements.append(PageBreak())
            elements.append(Paragraph("Detailed Appointment Requests", heading_style))
            
            request_table_data = [
                ["Customer", "Phone", "Hall", "Date", "Function Type", "Status"]
            ]
            
            for request in requests_data[:50]:
                phone_num = str(request.get("customerPhone", request.get("phone", "N/A")))
                
                request_table_data.append([
                    request["customerName"][:20],
                    phone_num[:15],             
                    request["hallName"][:15],
                    request["date"][:10],
                    request["functionType"][:15],
                    request["status"].capitalize()
                ])
            
            request_table = Table(request_table_data, colWidths=[
                1.1*inch,  # Customer
                1.0*inch,  # Phone (Naya add hua)
                1.0*inch,  # Hall
                0.8*inch,  # Date
                1.0*inch,  # Function Type
                0.7*inch   # Status
            ])
            
            request_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#5B21B6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')])
            ]))
            
            elements.append(request_table)
            
            if len(requests_data) > 50:
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(f"<i>* Showing first 50 of {len(requests_data)} records</i>", styles['Normal']))

        elements.append(Spacer(1, 0.5*inch))
        footer_text = """
        <i>This report was automatically generated by Event Hall Management System.<br/>
        For any queries, please contact the system administrator.</i>
        """
        elements.append(Paragraph(footer_text, styles['Normal']))
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        print(f"Report generated: {len(bookings_data)} bookings, {len(requests_data)} requests")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=report_{req.startDate}_to_{req.endDate}.pdf"
            }
        )
        
    except Exception as e:
        print(f"Report generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from firebase_admin import messaging
def send_fcm_push(user_id: str, title: str, body: str, data: dict = None):
    try:
        token_doc = db.collection("pushTokens").document(user_id).get()
        if not token_doc.exists:
            print(f"No push token for user: {user_id}")
            return False

        token = token_doc.to_dict().get("token")
        if not token:
            return False

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
        )
        response = messaging.send(message)
        print(f"FCM push sent to {user_id}: {response}")
        return True

    except Exception as e:
        print(f"FCM push error: {e}")
        return False


def send_fcm_push_to_many(user_ids: list, title: str, body: str, data: dict = None):
    for uid in user_ids:
        if uid:
            send_fcm_push(uid, title, body, data)    

class PushRequest(BaseModel):
    userId: str
    title: str
    body: str
    data: dict = {}

@app.post("/api/send-push")
async def send_push(req: PushRequest):
    """Frontend se push notification bhejne ke liye"""
    try:
        result = send_fcm_push(req.userId, req.title, req.body, req.data)
        return {"success": result}
    except Exception as e:
        print(f"Push error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class MultiPushRequest(BaseModel):
    userIds: list
    title: str
    body: str
    data: dict = {}

@app.post("/api/send-push-many")
async def send_push_many(req: MultiPushRequest):
    """Multiple users ko push bhejne ke liye"""
    try:
        result = send_fcm_push_to_many(req.userIds, req.title, req.body, req.data)
        return {"success": result}
    except Exception as e:
        print(f"Multi-push error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

class DeleteMediaRequest(BaseModel):
    publicId: str
    resourceType: str = "image" , "raw" 

@app.post("/api/delete-media")
async def delete_media(req: DeleteMediaRequest):
    try:
        result = cloudinary.uploader.destroy(
            req.publicId, 
            resource_type=req.resourceType
        )
        if result.get("result") == "ok":
            return {"success": True}
        else:
            raise HTTPException(status_code=400, detail="Delete failed on Cloudinary")
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ReceiptRequest(BaseModel):
    bookingId: str

from fastapi import UploadFile, File, Form

@app.post("/api/upload-media")
async def upload_media(file: UploadFile = File(...), resource_type: str = "image"):
    try:
        print(f"Uploading: {file.filename}, type: {resource_type}")
        contents = await file.read()
        result = cloudinary.uploader.upload(
            contents,
            resource_type=resource_type,
            upload_preset="eventhall-uploads"
        )
        print(f"Upload successful: {result['secure_url']}")
        return {
            "success": True,
            "url": result['secure_url'],
            "publicId": result['public_id']
        }
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/generate-receipt")
async def generate_receipt(req: ReceiptRequest):
    try:
        booking_ref = db.collection("bookings").document(req.bookingId)
        booking = booking_ref.get()
        
        if not booking.exists:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        data = booking.to_dict()
        
        total_amount = float(data.get("totalAmount", 0) or data.get("totalCharges", 0))
        advance_paid = float(data.get("advancePaid", 0) or data.get("advanceRequired", 0))
        remaining = float(data.get("remainingBalance", total_amount - advance_paid))
        status = data.get("status", "pending")
        is_refunded = status.lower() == "refunded"
        is_cancelled = status.lower() == "cancelled"
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.6*inch, bottomMargin=0.6*inch)
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'ReceiptTitle', parent=styles['Heading1'], fontSize=22,
            textColor=colors.HexColor('#5B21B6'), spaceAfter=4, alignment=1
        )
        subtitle_style = ParagraphStyle(
            'ReceiptSubtitle', parent=styles['Normal'], fontSize=11,
            textColor=colors.HexColor('#6B7280'), alignment=1, spaceAfter=20
        )
        heading_style = ParagraphStyle(
            'SectionHeading', parent=styles['Heading2'], fontSize=14,
            textColor=colors.HexColor('#111827'), spaceAfter=8, spaceBefore=16
        )
        
        elements.append(Paragraph("Event Hall Booking Receipt", title_style))
        elements.append(Paragraph("Official Payment Confirmation", subtitle_style))
        
        status_color = colors.HexColor('#10B981') if status.lower() in ['confirmed', 'completed'] else \
                       colors.HexColor('#EF4444') if is_refunded else colors.HexColor('#F59E0B')
        status_style = ParagraphStyle(
            'Status', parent=styles['Normal'], fontSize=13, fontName='Helvetica-Bold',
            textColor=status_color, alignment=1, spaceAfter=20
        )
        elements.append(Paragraph(f"Status: {status.upper()}", status_style))
        
        elements.append(Paragraph("Booking Information", heading_style))
        booking_data = [
            ["Booking ID", req.bookingId],
            ["Hall Name", data.get("hallName", "N/A")],
            ["Event Date", data.get("date", "N/A")],
            ["Event Time", data.get("timeSlot", "N/A")],
            ["Function Type", data.get("functionType", "N/A")],
            ["Customer Name", data.get("customerName", "N/A")],
        ]
        booking_table = Table(booking_data, colWidths=[2*inch, 3.5*inch])
        booking_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F3FF')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(booking_table)
        
        elements.append(Paragraph("Payment Details", heading_style))
        
        if is_refunded:
            payment_data = [
                ["Refunded Amount", f"PKR {int(total_amount):,}"],
                ["Refund Transaction ID", data.get("refundTransactionId", "N/A")],
            ]
        else:
            payment_data = [
                ["Total Charges", f"PKR {int(total_amount):,}"],
                ["Advance Paid", f"PKR {int(advance_paid):,}"],
                ["Remaining Balance", f"PKR {int(remaining):,}"],
                ["Transaction ID", data.get("transactionId", f"SP-{req.bookingId[-8:].upper()}")],
            ]
        
        payment_table = Table(payment_data, colWidths=[2*inch, 3.5*inch])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ECFDF5')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(payment_table)
        
        elements.append(Spacer(1, 0.4*inch))
        footer_style = ParagraphStyle(
            'Footer', parent=styles['Normal'], fontSize=9,
            textColor=colors.HexColor('#9CA3AF'), alignment=1
        )
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%d %B %Y, %I:%M %p')}<br/>"
            "This is a system-generated receipt from Event Hall Management.",
            footer_style
        ))
        
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=receipt_{req.bookingId}.pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Receipt generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# Background Cleanup Scheduler
# from apscheduler.schedulers.background import BackgroundScheduler
# from datetime import datetime, timedelta
# from google.cloud.firestore import FieldFilter
# from firebase_admin import auth

# def cleanup_unverified_users():
#     try:
#         print(" Running cleanup for unverified CUSTOMERS only...")
        
#         now_naive = datetime.utcnow()
#         twenty_four_hours_ago_naive = now_naive - timedelta(hours=24)
        
#         deleted_count = 0
#         users_ref = db.collection('users')
#         query = users_ref.where(filter=FieldFilter("emailVerified", "==", False)) \
#                          .where(filter=FieldFilter("role", "==", "customer")).stream()
        
#         for doc in query:
#             user_data = doc.to_dict()
#             created_at_str = user_data.get('createdAt')
            
#             if created_at_str:
#                 try:
#                     created_dt = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
#                     created_dt_naive = created_dt.replace(tzinfo=None)
                    
#                     if created_dt_naive < twenty_four_hours_ago_naive:
#                         user_email = user_data.get('email')
#                         user_uid = user_data.get('uid')
                        
#                         doc.reference.delete()
#                         print(f"Deleted unverified Customer: {user_email}")
                        
#                         if user_uid:
#                             try:
#                                 auth.delete_user(user_uid)
#                             except auth.UserNotFoundError:
#                                 pass
                        
#                         deleted_count += 1
#                 except ValueError:
#                     continue

#         print(f"Cleanup finished. Total deleted: {deleted_count} users.")
#     except Exception as e:
#         print(f"Cleanup error: {e}")

# scheduler = BackgroundScheduler()
# scheduler.add_job(cleanup_unverified_users, 'interval', hours=1)
# scheduler.start()
# print(" Background cleanup scheduler started (SAFE MODE: Customers Only)!")
