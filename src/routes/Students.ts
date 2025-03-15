import express, { Request, Response, Router } from "express";
import { prismaClient } from "../lib/db";

const router = express.Router();

router.post('/join-request', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const classRoom = await prismaClient.class.findUnique({where:{id: data.classId}})
        if(!classRoom){
            res.status(404).json({success:false, message:"Class room not found"});
            return;
        }

        if(classRoom.passcode != data.passcode){
            res.status(400).json({success:false, message:"Wrong passcode provided"});
            return;
        }

        const joinRequest = await prismaClient.classJoinRequest.create({data:{
            student: {connect: user.id},
            class: {connect: data.classId},
            passcode: data.passcode
        }});
        if(!joinRequest){
            res.status(400).json({success:false, message:"Unable to send the join request"});
            return;
        }

        res.status(200).json({success:true, message:"Requested to join the class."});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/join-request', async(req:Request, res:Response) => {
    try{
        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const joinRequestClasses = await prismaClient.classJoinRequest.findMany({
            where:{studentId:user.id},
            include: {
                class: {
                    select: {
                        name: true,
                        description: true
                    }
                }
            }
        });

        if(!joinRequestClasses){
            res.status(400).json({success:false, message:"No join requests"});
            return;
        }

        res.status(200).json({success:true, message:"Classes you requested to join are fetched", classes:joinRequestClasses});

    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});


router.get('/enroll-classes', async(req:Request, res:Response) => {
    try{
        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const enrollClasses = await prismaClient.classEnrollment.findMany({
            where:{studentId:user.id},
            include:{
                class:{
                    select:{
                        name:true,
                        description:true
                    }
                }
            }
        });
        if(!enrollClasses){
            res.status(400).json({success:false, message:"No enrolled classes"});
            return;
        }

        res.status(200).json({success:true, message:"Classes you requested to join are fetched", classes:enrollClasses});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

// delete the join request or enrollment from the class 

export default router;