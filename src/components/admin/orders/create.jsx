import moment from 'moment/moment';
import { useEffect, useState } from 'react';
import { useFormik } from "formik";
import { useDispatch, useSelector } from 'react-redux';
import { Autocomplete, Box, Button, Card, Grid, TextField, Typography } from '@mui/material';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import { generatePdfDefinition } from './helper';
import { Delete, Sync } from '@mui/icons-material';
import { createOrderAction, fetchWeightsAction } from '../../../store/orders';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export const CreateOrder = () => {

    const dispatch = useDispatch();
    const initialOrderProps = {
        customerName: "",
        customerMobile: "",
        orderNumber: "ORD-XXXXXXXX",
        orderDate: moment().format("DD-MM-YYYY"),
        orderItems: [],
        subTotal: 0,
        tax: 0,
        taxPercent: 12,
        total: 0
    };
    const { products: { rows} } = useSelector(state => state.productState);
    const productOptions = Object.keys(rows)?.map(id => { return { label: rows[id].name.toUpperCase(), productId: id, value: rows[id].name } });

    const onProductSelect = (e, value) => {
        if(value){
            const { label, productId } = value;
            formik.setFieldValue('id', productId ?? "");
            formik.setFieldValue('name', productId ? rows[productId]?.name : "");
            formik.setFieldValue('type', productId ? rows[productId]?.type : "" );
            formik.setFieldValue('productPrice', productId ? rows[productId]?.pricePerKg : 0);
            formik.setFieldValue('totalPrice', productId ? rows[productId]?.pricePerKg * formik.values.quantity : 0);
        }
        else{
            formik.resetForm();
        }
    }

    const onQuantityChange = (e) => {
        const val = e.target.value;
        formik.setFieldValue('quantity', val);
        formik.setFieldValue('totalPrice', formik.values.productPrice * val);
    }

    const weighingScaleHandler = async () => {
        const { weight} = await dispatch(fetchWeightsAction());

        if(weight){
            formik.setFieldValue('quantity', weight ); 
            formik.setFieldValue('totalPrice', formik.values.productPrice * weight);
        }
    }

    const onCustomerInfoChange = (e) => {
        setOrderProps((prevProps) => {
            return {
                ...prevProps,
                [e.target.id]: e.target.value
            }
        });
    }

    const removeItem = (index) => {
        const item = orderProps.orderItems[index];

        const subTotal = orderProps.subTotal - item.totalPrice;
        const tax = subTotal * (orderProps.taxPercent / 100);

        const newItem = {
            subTotal: subTotal,
            tax: tax,
            total: subTotal + tax,
            orderItems: orderProps.orderItems.filter((item, position) => position !== index)
        };

        setOrderProps((prevProps)=> {
            const newProps = {
                ...prevProps,
                ...newItem
            }
            generatePdf(newProps);
            return newProps;
        });
    }

    const generatePdf = (pdfProps) => {
        const updatedProps = JSON.parse(JSON.stringify(pdfProps));
        updatedProps.orderItems = updatedProps['orderItems']?.map(item => { return { 
            name: rows[item.productId].name,
            productPrice: rows[item.productId].pricePerKg,
            quantity: item.quantity,
            totalPrice: item.totalPrice
        }}) ?? [];

        const pdfObject = generatePdfDefinition(updatedProps);
        pdfMake.createPdf(pdfObject).getBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        });  
    };

    const createOrder = async() => {
        const { orderNumber } = await dispatch(createOrderAction(orderProps));
        
        if(orderNumber){
            setOrderProps((prevProps)=> {
                const newProps = {
                    ...prevProps,
                    orderNumber: orderNumber
                }
                generatePdf(newProps);
                return initialOrderProps;
            });
        }
    }

    const [pdfUrl, setPdfUrl] = useState('');
    const [orderProps, setOrderProps] = useState(initialOrderProps);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id:"",
            type: "",
            name: "",
            productPrice: 0,
            quantity: 0,
            totalPrice: 0
        },
        onSubmit: async (values) => {

            const subTotal = orderProps.subTotal + values.totalPrice;
            const tax = subTotal * (orderProps.taxPercent / 100);

            const newItem = {
                subTotal: subTotal,
                tax: tax,
                total: subTotal + tax,
                orderItems: [...orderProps.orderItems, {
                    productId: values.id,
                    name: values.name,
                    quantity: values.quantity,
                    productPrice: values.productPrice,
                    totalPrice: values.totalPrice,
                    type: values.type
                }]
            };

            setOrderProps((prevProps)=> {
                const newProps = {
                    ...prevProps,
                    ...newItem
                }
                generatePdf(newProps);
                return newProps;
            });
            formik.resetForm();
        }
    });

    useEffect(() => {
        generatePdf(orderProps);
    }, []);

    return (
        <>
        <br></br>
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <Box component={"form"} noValidate autoComplete="off">
                    <Grid container spacing={2}>
                       <Grid item xs={12} md={4} >
                            <TextField
                                size="small"
                                id="customerName"
                                name="customerName"
                                label="Customer Name"
                                value={orderProps.customerName}
                                onChange={onCustomerInfoChange}
                                required
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                size="small"
                                id="customerMobile"
                                name="customeMobile"
                                label="Customer Mobile"
                                value={orderProps.customerMobile}
                                onChange={onCustomerInfoChange}
                                required
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                size="small"
                                type='number'
                                id="taxPercent"
                                name="taxPercent"
                                label="Tax Percentage"
                                value={orderProps.taxPercent}
                                onChange={onCustomerInfoChange}
                                required
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12} md={12} mt={2}>
                            <Autocomplete
                                size="small"
                                id="name"
                                name="name"
                                value={formik.values.name}
                                disablePortal
                                options={productOptions}
                                onChange={onProductSelect}
                                renderInput={(params) => <TextField {...params} label="Select Product" />}
                                />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                type="number"  
                                size="small"
                                id="productPrice"
                                name="productPrice"
                                label="Product Price"
                                value={formik.values.productPrice}
                                onChange={formik.handleChange}
                                required
                                fullWidth
                                error={formik.errors.productPrice}
                                helperText={formik.errors.productPrice}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                size="small"
                                id="type"
                                name="type"
                                label="Product Type"
                                value={formik.values.type}
                                disabled
                                required
                                fullWidth
                                error={formik.errors.type}
                                helperText={formik.errors.type}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                size="small"
                                type="number"
                                id="quantity"
                                name="quantity"
                                label="Quantity (Kg)"
                                value={formik.values.quantity}
                                onChange={onQuantityChange}
                                required
                                fullWidth
                                error={formik.errors.quantity}
                                helperText={formik.errors.quantity}
                                InputProps={{endAdornment: <Button onClick={weighingScaleHandler}><Sync/></Button>}}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                size="small"
                                id="price"
                                name="price"
                                label="Total Price"
                                value={formik.values.totalPrice}
                                disabled
                                required
                                fullWidth
                                error={formik.errors.totalPrice}
                                helperText={formik.errors.totalPrice}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button variant="contained" onClick={createOrder} sx={{float: "right", margin: "5px"}} disabled={orderProps.orderItems.length === 0}> Submit</Button>
                            <Button variant="contained" onClick={formik.handleSubmit} sx={{float: "right", margin: "5px"}} disabled={formik.values.name === ""}>Add Product</Button>
                        </Grid>
                    </Grid>
                </Box>

                <br></br>

                {orderProps.orderItems?.map((item, index) => {
                    return (
                        <Card sx={{padding: '5px 15px ', margin: '5px 2px'}}>
                            <Grid container>
                                <Grid item xs={10}>
                                    <Typography variant='body2'>Name: {rows[item.productId].name} | Qty: {item.quantity} | Price: {item.totalPrice}</Typography>
                                </Grid>
                                <Grid item xs={2}>
                                    <Button size="small" onClick={() => removeItem(index)}><Delete /></Button>
                                </Grid>
                            </Grid>
                        </Card>
                    );
                })}
            </Grid>


            <Grid item xs={12} sm={6} >
                <Box
                    sx={{
                        height: '90vh',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Box
                        sx={{
                            flexGrow: 1,
                            '& iframe': {
                                width: '100%',
                                height: '100%',
                                border: 'none'
                            }
                        }}
                    >
                        <iframe src={pdfUrl} title='Invoice' />
                    </Box>
                </Box>
            </Grid>
        </Grid>
        </>
    );
}