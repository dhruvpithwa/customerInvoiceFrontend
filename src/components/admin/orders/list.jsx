import { Box, Button, Paper, Modal, TextField, Typography, TableContainer, Table, TableHead, TableBody, TableCell, TableRow, } from '@mui/material';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState, Children } from 'react';
import { listOrdersAction, deleteOrderAction } from '../../../store/orders';
import { Pagination } from '../../common/pagination';
import { generatePdfDefinition } from './helper';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    p: 4,
};


export const ListOrders = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { orders: { count, rows } } = useSelector(state => state.orderState);

    const [pdfUrl, setPdfUrl] = useState('');
    const [refetch, shouldFetch] = useState(true);
    const [filters, setFilters] = useState({
        limit: 25,
        offset: 0,
        q: ""
    });

    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    useEffect(() => {
        if (refetch) {
            shouldFetch(false);
            dispatch(listOrdersAction(filters));
        }
    }, [refetch]);


    const paginate = (limit, offset) => {
        shouldFetch(true);
        setFilters((prevState) => {
            return {
                ...prevState,
                limit: limit,
                offset: offset,
            };
        });
    };

    const filterChangeHandler = (e) => {
        setFilters((prevState) => {
            return {
                ...prevState,
                [e.target.id]: e.target.value
            };
        });
    }

    const generatePdf = (orderObj) => {
        const pdfObject = generatePdfDefinition(orderObj);
        pdfMake.createPdf(pdfObject).getBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            handleOpen();
        });
    };

    useEffect(() => {
        const getData = setTimeout(() => {
            dispatch(listOrdersAction(filters));
        }, 500);

        return () => clearTimeout(getData);
    }, [filters.q]);

    return (
        <>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
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

                </Box>
            </Modal>

            <Typography component={'div'}>
                <TextField size="small" id="q" label="Search Order" onChange={filterChangeHandler} sx={{ margin: "0px 15px 0px 0px" }}></TextField>
                <Button variant="contained" onClick={() => navigate(`create`)} sx={{ margin: "0px 15px" }}>Create Order</Button>
            </Typography>

            <br></br>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><b>Order Number</b></TableCell>
                            <TableCell><b>Order Date</b></TableCell>
                            <TableCell><b>Name</b></TableCell>
                            <TableCell><b>Mobile</b></TableCell>
                            <TableCell><b>Subtotal</b></TableCell>
                            <TableCell><b>Tax</b></TableCell>
                            <TableCell><b>Total</b></TableCell>
                            <TableCell><b>Action</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            Children.toArray(Object.values(rows).map((orderObj) => {
                                return (
                                    <TableRow>
                                        <TableCell>{orderObj.orderNumber}</TableCell>
                                        <TableCell>{orderObj.orderDate}</TableCell>
                                        <TableCell>{orderObj.customerName}</TableCell>
                                        <TableCell>{orderObj.customerMobile}</TableCell>
                                        <TableCell>{orderObj.subTotal}</TableCell>
                                        <TableCell>{orderObj.tax} ({orderObj.taxPercent}%)</TableCell>
                                        <TableCell>{orderObj.total}</TableCell>
                                        <TableCell>
                                            <Button variant='outlined' sx={{ margin: '5px' }} onClick={() => { dispatch(deleteOrderAction(orderObj.id)) }}>Delete</Button>
                                            <Button variant='outlined' sx={{ margin: '5px' }} onClick={() => { generatePdf(orderObj) }}>View</Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            }))
                        }
                    </TableBody>
                </Table>
            </TableContainer>
            <Pagination
                limit={filters.limit}
                offset={filters.offset}
                count={count}
                updateFilters={paginate}
            />

        </>
    );
}
