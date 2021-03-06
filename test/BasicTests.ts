import {Item, Order} from "./models/Order";
import {expect} from "chai";
import {Binary, ObjectID} from "mongodb";
import {Customer} from "./models/Customer";
import {EmbeddedModel} from "../src/EmbeddedModel";
import {Article} from "./models/Article";
import {Sunshine} from "../src/Sunshine";

/**
 * Sunshine V1
 *
 * Copyright (c) Michael Hasler
 */
describe('Basic attribute persistence tests', function () {

    it("Creating DocumentModel and extracting Document", async () => {

        let order = new Order();
        order.customer_id = ObjectID.createFromHexString("58f0c0ac235ea70d83e6c672");
        order._customer = new Customer();
        order._customer.firstname = "Michael";

        await order.save();

        let doc = order.toObject(true);

        return;
    });

    it("Testing correct type persistence", async () => {

        let order = new Order();
        order.created = new Date();
        order.customer_id = ObjectID.createFromHexString("58f0c0ac235ea70d83e6c672");
        order._customer = new Customer();
        order._customer.firstname = "Michael";
        (order as any).testString = "Hello";
        (order as any).num = 232343.2342342;

        await order.save();

        console.log(order._id);
        let newOrder = await Order.findOne<Order>({ _id : order._id });

        expect(newOrder.created).to.be.an("Date");
        expect(newOrder.customer_id).to.be.instanceof(ObjectID);
        expect((newOrder as any).testString).to.be.an("string");
        expect((newOrder as any).num).to.be.an("number");

        return;
    });

    it("Properties are updated correctly", async () => {

        const customer = new Customer();
        customer.firstname = "Michael";
        await customer.save();

        const update = {
            _id: customer._id.toString(),
            firstname: "Markus",
            lastname: "Müller"
        };

        customer.__elevate(update);

        expect(customer._id).to.be.instanceof(ObjectID);

        await customer.save();

        expect(customer.firstname).to.be.equal("Markus");
        expect(customer.lastname).to.be.equal("Müller");

        return;
    });

    it("Query non existing documents (handling of empty - null results)", async () => {

        let customer = await Customer.findOne({ _id: "null" });

        expect(customer).to.be.null;

    });

    it("Query (multiple) with select", async () => {

        // find all fields
        let customer = await Customer.find({}).toArray();
        let keys = Object.keys(customer[0]);
        expect(keys.length).to.be.equal(4);

        // find only one field
        customer = await Customer.find({}, { firstname: true }).toArray();
        keys = Object.keys(customer[0]);
        expect(keys.length).to.be.equal(3);

    });

    it("Embedded Models are parsed", async() => {

        let order = new Order();
        order.customer_id = ObjectID.createFromHexString("58f0c0ac235ea70d83e6c672");
        order._customer = new Customer();
        order._customer.firstname = "Michael";
        order.items.push(new Item({
            amount: 20,
        }));

        await order.save();

        let orderRecover = await Order.findOne<Order>({ _id: order._id });

        expect(orderRecover.items[0]).to.be.instanceOf(EmbeddedModel);

    });

    it("Update document", async () => {

        const customer = new Customer();
        customer.firstname = "Michael";
        await customer.save();

        // update property
        await Customer.update({ _id : customer._id }, {
            firstname: "Markus"
        });

        // find updated model
        const customerUpdated = await Customer.findOne<Customer>({ _id: customer._id });
        expect(customerUpdated.firstname).to.be.equal("Markus");

    });

    it("Create document with auto-type parse objectid", async () => {

        const order = new Order();
        (order as any).customer_id = "5a0368ea7bb6ebb9fc10b8e8";

        await order.save();

        const orderSaved = await Order.findOne<Order>({ _id: order._id });
        expect(orderSaved.customer_id).to.be.instanceof(ObjectID);

    });

    it("Child property is saved correctly from basis", async () => {

        const order = new Order();
        order.attributes = {
            customer_id: ObjectID.createFromHexString("5a0368ea7bb6ebb9fc10b8e8")
        };
        await order.save();

        order.__elevate({
            attributes: {
                customer_id: "5a0368ea7bb6ebb9fc10b8e8"
            }
        });
        await order.save();

        const orderSaved = await Order.findOne<Order>({ _id: order._id });
        expect(orderSaved.attributes.customer_id).to.be.instanceof(ObjectID);

    });

    it("Encryption decorator", async () => {

        const article = new Article();
        article.encryptedProperty = "Hello Rijeka";

        await article.save();

        const dbValue = await (new Promise((resolve, reject) => {
            Sunshine.getConnection().collection("articles").findOne({ _id: article._id }).then((article) => {
                resolve(article.encryptedProperty)
            })
        }));

        expect(dbValue).not.to.be.equal("Hello Rijeka");

        const articleLoaded = await Article.findOne<Article>({ _id : article._id });
        expect(articleLoaded.encryptedProperty).to.be.equal("Hello Rijeka");

    });

    it("Binary type is saved and retrieved correctly", async () => {

        const article = new Article();

        const buffer = Buffer.from([1, 2, 3]);
        article.binaryField = new Binary(buffer);

        await article.save();
        expect(article.binaryField).to.be.instanceOf(Binary);

        const articleSaved = await Article.findOne<Article>({ _id: article._id });
        expect(articleSaved.binaryField).to.be.instanceOf(Binary);

    });

});

