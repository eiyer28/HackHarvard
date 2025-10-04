ProxyPay:
We are building a system for HackHarvard that helps validate transactions. This is due by 7 am on Oct 5 2025 and needs to be within the scope of a hackathon. 

The general idea is that this system gathers the location of a user's phone, or a phone that they have authorized. It then takes in this information as well as the location of a credit card transaction, and then it denies transactions that did not happen at the same place as the credit card user. Also if someone gets my card information and makes an online purchase, e commerce sites that have our ui layered in would flag this transaction and cause it to not go through, though we will keep things simple and not implement this as a layer on top of e commerce like stripe. 

The main features are as follows:

UI to get fake credit card information and transaction information to simulate a transaction. 
Transaction mockup where people are able to simulate a transaction from a given place, or use on their on device lovation
Location tracking on user's phone to get the user information. 
System to validate that phone and transaction location are sufficiently close

Stack:
React native for a mobile app
Website frontend for transaction simulation

Backend:
Python backend
Database in either mongodb or firebase or sql whichever one is easiest
Some kind of geospatial processing

Twilio API for two factor authentication for transactions over a certain large amount of cost.