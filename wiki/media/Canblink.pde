//canblink.ino - show that the sparkfun and seeed CAN shields are receiving OK
//This work is licensed under a Creative Commons Attribution 3.0 Unported License.
//CC-by Charles Hart 2013
#include <mcp_can.h>
#include <SPI.h>

#define BLINK0  7 //define led pins as on sparkfun shield
#define BLINK1  8

unsigned char Flag_Recv = 0;
unsigned char len = 0;
unsigned char buf[8];
unsigned long msgCanId = 0;

void setup()
{
  Serial.begin(57600);
  Serial.println("Blinkenlites CAN bus demo");
  
  if(CAN.begin(CAN_500KBPS) == CAN_OK) 
    Serial.print("CAN Bus Init OK!\r\n");
  else 
    Serial.print("CAN Bus Failure!\r\n");
    
  attachInterrupt(0, MCP2515_ISR, FALLING); //enable interrupt 0 to trigger fn. on falling edge (pin 2)
  
  pinMode(BLINK0, OUTPUT); //enable LED output 
  pinMode(BLINK1, OUTPUT);
}

void MCP2515_ISR()
{
    Flag_Recv = 1;
}

void loop()
{
    if(Flag_Recv)                           // check if get data
    {
      Flag_Recv = 0;                        // clear flag
      CAN.readMsgBuf(&len, buf);            // read data,  len: data length, buf: data buf
      msgCanId = CAN.getCanId();
      
      Serial.print("GOT ");                 //indicate that data was rcvd on can bus
      Serial.print(len);
      Serial.print(" data bytes FROM ");
      Serial.println(msgCanId);
      
      for(int i = 0; i<len; i++)            // print the data in tabular form
      {
        Serial.print(buf[i]);
        Serial.print("\t");
      }
      Serial.println();
      
      //clear the LEDs (just before setting them)
      digitalWrite(BLINK0, LOW);
      digitalWrite(BLINK1, LOW);     
      
      //set das blinkenlites to de bottom two bits of der first byte of data
      
      if(buf[0] & 0b01)
        digitalWrite(BLINK0, HIGH);
      if(buf[0] & 0b10)
        digitalWrite(BLINK1, HIGH);
      
      
      //set das blinkenlites to de bottom two bits of der CAN Data Frame ID
      /*
      if(msgCanId & 0b01)
        digitalWrite(BLINK0, HIGH);
      if(msgCanId & 0b10)
        digitalWrite(BLINK1, HIGH);
      */
    }
}