Kotak Neo

1) Go to https://www.kotakneo.com/platform/kotak-neo-trade-api/
2) Click on Login on top right and log in to your kotak neo brokerage account
3) Click on More on top right
4) Click on Trade API
here add ./add_broker_images/kotakneo1.png
5) Click on Create API key
6) copy the Client token -> This is your API Key
7) Add: 54.79.156.120 to Primary IP / IP whitelist
here add ./add_broker_images/kotakneo2.png
8) Now go to profile -> Account details
9) Locate your "Unique Client Code" -> This is your Client ID
10) Now locate the 2FA Authenticator code for kotak neo that you previously setup -> This is your TOTP
11) Finally go to "My Brokers" tab on HedgeOne platform and press "Add Broker"
12) Fill in the credentials we collected and press "Save"
13) Kotak neo requires you to refresh the "TOTP" which is valid only for 30 sec. So perform the "Update TOTP" to create a fresh session before deploying.

Zerodha

1) Go to https://zerodha.com/products/api/
2) Press "Get API Key"
here add ./add_broker_images/kite1.png
3) Fill out the form using the email you used for your Zerodha broker account
here add ./add_broker_images/kite2.png
4) Add IP: 54.79.156.120 to "IP Whitelist"
5) Press "Sign Up"
6) Now you should be navigated to "My apps" page. Click on "Create new app"
here add ./add_broker_images/kite3.png
7) Now choose "Personal" in type
8) App name can be of your choosing
9) Your Zerodha Client ID is where you put your Client ID (Can be found on Profile page of Zerodha Mobile app or web app)
10) Redirect URL is: https://hedgeone.co.in/api/zerodha/callback
11) Click on "Create"
here add ./add_broker_images/kite4.png
12) Now your newly created app should be visible in "My Apps"
13) Click on the newly created app and you will be directed to a details page
14) Fetch "API Key". Then press "Show API Secret". Copy this as well
here add ./add_broker_images/kite5.png
15) Finally go to "My Brokers" tab on HedgeOne platform and press "Add Broker"
16) Fill in the credentials we collected and press "Save"
17) Perform Daily login to start the session everyday in the morning. Zerodha session resets at midnight, everynight.

Angelone

1) Go to https://smartapi.angelbroking.com/
2) Press "Enable TOTP" and sign in using your Client ID (From angelone User Profile) and MPIN
3) Copy the TOTP Code
4) Then press Login on top right
5) Login to your Angelone Account
6) Press "ADD APP" and add 54.79.156.120 to "Primary Static IP" and press "Add"
7) Copy your API Key and Secret Key
Here add ./add_broker_images/angelone1.png
8) Finally go to "My Brokers" tab on HedgeOne platform and press "Add Broker"
9) Fill in the credentials we collected and press "Save"

