export default function Home() {
  const payNow = async () => {
    try {
      const orderResponse = await fetch("http://localhost:5000/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: 1 })
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const order = await orderResponse.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "My SaaS App",
        description: "One-time payment",
        order_id: order.id,
        handler: async (response) => {
          const finalResponse = { ...response, amount: 1 };
          const verifyResponse = await fetch("http://localhost:5000/api/payment/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(finalResponse)
          });

          if (!verifyResponse.ok) {
            alert("Payment verification failed");
            return;
          }

          const data = await verifyResponse.json();
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

  return <button onClick={payNow}>Pay INR 499</button>;
}
