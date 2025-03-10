import express from "express";
import { prisma } from "@repo/db";
const app = express();

app.use(express.json());

// @ts-ignore
app.post("/webhook", async (req, res) => {
    const { submission_id, result, stdout, stderr, time, memory } = req.body;

    const submission = await prisma.submission.findUnique({
        where: {
            id: submission_id,
        },
    });

    if (!submission) {
        return res.status(404).send("Submission not found");
    }

    submission.status = result;
    submission.stdout = stdout;
    submission.stderr = stderr;
    submission.time = time;
    submission.memory = memory;

    await prisma.submission.update({
        where: { id: submission_id },
        data: submission,
    });

    res.status(200).send("Webhook received");
});

