import express from "express";
import { prismaClient } from "../lib/db";
const router = express.Router();

router.get('/', async(req, res) => {
    res.status(200).send("Hellow from users");
});

router.post('/signup', async(req, res) => {
    try{
        const data1:any = req.body;
        console.log(data1);
        const response = await prismaClient.student.create({data:{...data1}});
        res.status(200).json({response});
    }catch(err){
        res.status(500).json({message:"Internal server error", err});
    }

});

module.exports = router;