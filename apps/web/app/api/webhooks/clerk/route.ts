import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@repo/db';

// The WEBHOOK_SECRET is obtained from your Clerk Dashboard's Webhook settings
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';


export async function POST(req: NextRequest) {
  console.log("Clerk webhook received");
  // Verify the webhook signature
  const payload = await req.text();
  const headerPayload = req.headers;
  
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');
  
  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing Svix headers' },
      { status: 400 }
    );
  }
  
  // Create an object with the headers
  const svixHeaders = {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  };
  
  // If there is no webhook secret, error out
  if (!webhookSecret) {
    console.error('Missing Clerk webhook secret');
    return NextResponse.json(
      { error: 'Missing webhook secret' },
      { status: 500 }
    );
  }
  
  let event: WebhookEvent;
  
  try {
    const webhook = new Webhook(webhookSecret);
    event = webhook.verify(payload, svixHeaders) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Error verifying webhook' },
      { status: 400 }
    );
  }
  
  // Handle the webhook
  const eventType = event.type;
  console.log(`Webhook with type ${eventType}`);
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = event.data;
    
    if (!id || !email_addresses || !email_addresses[0]?.email_address) {
      return NextResponse.json(
        { error: 'Missing user data in webhook payload' },
        { status: 400 }
      );
    }
    
    const userEmail = email_addresses[0].email_address;
    // This removes any undefined values from the array
    const userName = [first_name, last_name].filter(Boolean).join(' ');
    
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: id as string },
      });
      
      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { id: id as string },
          data: {
            email: userEmail,
            name: userName || null,
          },
        });
        console.log(`Updated user: ${id}`);
      } else {
        // Create new user with Clerk ID as the primary key
        try {
          await prisma.user.create({
            data: {
              id: id as string,
              email: userEmail,
              name: userName || null,
            },
          });
          console.log(`Created user: ${id}`);
        } catch (dbError) {
          console.error('Database error creating user:', dbError);
          return NextResponse.json(
            { error: 'Database error creating user' },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error saving user to database:', error);
      return NextResponse.json(
        { error: 'Failed to save user to database' },
        { status: 500 }
      );
    }
  } else if (eventType === 'user.deleted') {
    const { id } = event.data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing user ID in webhook payload' },
        { status: 400 }
      );
    }
    
    try {
      // Delete the user from our database
      await prisma.user.delete({
        where: { id: id as string },
      });
      console.log(`Deleted user: ${id}`);
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting user from database:', error);
      return NextResponse.json(
        { error: 'Failed to delete user from database' },
        { status: 500 }
      );
    }
  }
  
  // Return a 200 response for any other event types
  return NextResponse.json({ received: true });
} 