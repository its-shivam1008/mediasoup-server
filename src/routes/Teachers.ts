import express, { Request, Response, Router } from "express";
import { prismaClient } from "../lib/db";

const router = express.Router();

router.post('/create-class', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const createClass =  await prismaClient.class.create({data:{
            name:data.name,
            description:data.description,
            passcode:data.passcode,
            createdBy:user.id
        }})

        if(!createClass){
            res.status(405).json({success:false, message:"Unable to create class room"});
            return;
        }

        res.status(200).json({success:true, message:"Class room created."});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.put('/update-class', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const existingClass = await prismaClient.class.findUnique({
            where: { id: data.classId }
        });

        if (!existingClass) {
            res.status(404).json({ success: false, message: "Class not found" });
            return;
        }

        if(data.name || data.description || data.passcode){
            const updatedClass = await prismaClient.class.update({where:{id:data.classId}, data:{...data}});
            if(!updatedClass){
                res.status(400).json({success:false, message:"Unable to update the class"});
                return;
            }
        }

        res.status(200).json({success:true, message:"Class room updated"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/classes', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const classes = await prismaClient.class.findMany({where:{createdById:user.id}});
        if(!classes){
            res.status(400).json({success:false, message:"Unable to fetch the class rooms"});
            return;
        }

        res.status(200).json({success:true, message:"Class rooms are fetched.", classRooms:classes});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.delete('delete-class', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const existingClass = await prismaClient.class.findUnique({
            where: { id: data.classId }
        });

        if (!existingClass) {
            res.status(404).json({ success: false, message: "Class not found" });
            return;
        }

        await prismaClient.classJoinRequest.deleteMany({where:{classId:data.classId}});
        await prismaClient.classEnrollment.deleteMany({where:{classId:data.classId}});

        const deletedClass = await prismaClient.class.delete({ where: { id: data.classId } });
        if(!deletedClass){
            res.status(200).json({success:false, message:"Cannot delete the class room"});
        }

        res.status(200).json({success:true, message:"Class room deleted"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
})


export default router;