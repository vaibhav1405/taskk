const cors = require("cors");
const express = require("express");
const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
const uuid = require("uuid/v4");
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://vaibhav74:vaibhav74@cluster0.srx65.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',{useNewUrlParser: true});

const payschema = mongoose.Schema({
  name:String,
  paid:{type:Boolean,default:false},
  receipt_url:String
})
const pay = mongoose.model('pay',payschema);
const app = express();

app.use(express.json());
app.use(cors());


app.post("/checkout", async (req, res) => {
  console.log("Request:", req.body);

  let error;
  let status;
  try {
    const { product, token } = req.body;

    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id
    });

    const idempotency_key = uuid();
    const charge = await stripe.charges.create(
      {
        amount: product.price * 100,
        currency: "inr",
        customer: customer.id,
        receipt_email: token.email,
        description: `Purchased the ${product.name}`,
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip
          }
        }
      },
      {
        idempotency_key
      }
    );
    console.log("Charge:", { charge });
    status = "success";
    if(status == "success"){
      const {paid,receipt_url,shipping} = charge;
      pay.insertMany({name:shipping.name,receipt_url:receipt_url,paid:true},(err,data)=>{
        console.log(err,data);
      })
    }
  } catch (error) {
    console.error("Error:", error);
    status = "failure";
  }
    
  res.json({ error, status });
});

app.listen(8080,()=>{
	console.log("server started")
});
