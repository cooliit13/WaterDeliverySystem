const { MongoClient, ObjectId } = require('mongodb');
const MONGO = process.env.MONGO_URI || 'your_mongo_uri_here';
const ORDER_ID = process.argv[2];
if (!ORDER_ID) { console.error('Usage: node tx-deduct-order.js <orderId>'); process.exit(1); }

(async function () {
  const client = new MongoClient(MONGO, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db('WaterSystemDB');
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const orders = db.collection('orders');
      const products = db.collection('products');
      const stocks = db.collection('stocks');
      const stockMovements = db.collection('stock_movements');

      // ensure index
      await stockMovements.createIndex({ orderId: 1, productName: 1 }, { unique: true, sparse: true });

      const order = await orders.findOne({ _id: ObjectId(ORDER_ID) }, { session });
      if (!order) throw new Error('Order not found');

      // idempotency guard
      const existed = await stockMovements.findOne({ orderId: order._id }, { session });
      if (existed) { console.log('Movements exist already — aborting.'); return; }

      for (const it of (order.items || [])) {
        const pname = it.productName || 'UNKNOWN';
        const qty = it.quantity || 0;

        // find product by name to seed initial stock if any
        const p = await products.findOne({ name: pname }, { session });
        const seedQty = (p && (p.stock || p.quantity || p.inventory)) ?? qty;

        // ensure stock row exists; setOnInsert uses seedQty
        await stocks.updateOne(
          { productName: pname },
          { $setOnInsert: { productName: pname, quantity: seedQty } },
          { upsert: true, session }
        );

        const stockRow = await stocks.findOne({ productName: pname }, { session });
        if (stockRow.quantity < qty) {
          // If you want to allow negative stock/backorder, comment out the throw and proceed.
          throw new Error(`Insufficient stock for "${pname}". Have ${stockRow.quantity}, need ${qty}`);
        }

        const beforeQty = stockRow.quantity;
        const afterQty = beforeQty - qty;

        await stocks.updateOne({ productName: pname }, { $set: { quantity: afterQty } }, { session });

        await stockMovements.insertOne({
          productName: pname,
          change: -qty,
          beforeQty,
          afterQty,
          reason: 'MANUAL_ORDER_DEDUCTION',
          orderId: order._id,
          createdAt: new Date()
        }, { session });
      }

      // update order items' deliveredQty and flags
      const updatedItems = (order.items || []).map(it => ({ ...it, deliveredQty: it.quantity || 0 }));
      const updateDoc = {
        $set: {
          items: updatedItems,
          stockDeducted: true,
          stockDeductedAt: new Date()
        }
      };
      if (!order.completedAt && order.status === 'completed') updateDoc.$set.completedAt = order.updatedAt || new Date();
      await orders.updateOne({ _id: order._id }, updateDoc, { session });

      console.log('Transaction successful for order', ORDER_ID);
    }, {
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' }
    });
  } catch (err) {
    console.error('Transaction aborted:', err.message);
  } finally {
    await session.endSession();
    await client.close();
  }
})();
