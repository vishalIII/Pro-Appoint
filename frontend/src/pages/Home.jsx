import axios from "axios";

export default function Home() {

  console.log(import.meta.env.VITE_RAZORPAY_KEY_ID);
  const payNow = async () => {
    try {
      const { data: order } = await axios.post(`http://localhost:5000/api/payment/create-order`, { amount: 1 });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "My SaaS App",
        description: "One-time payment",
        order_id: order.id,

        handler: async (response) => {
          const { data } = await axios.post(`http://localhost:5000/api/payment/verify-payment`, response);
          if (data.success) alert("Payment successful");
          else alert("Payment verification failed");
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  };

  return <button onClick={payNow}>Pay ₹499</button>;
};



