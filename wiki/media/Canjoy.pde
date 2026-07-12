//canjoy.ino - Lets an Arduino use the CAN-Bus shield w/ joystick from SKPang/Sparkfun.
//This work is licensed under a Creative Commons Attribution 3.0 Unported License.
//CC-by Charles Hart 2013

#include <mcp_can.h>
#include <SPI.h>

/* Define Joystick connection pins*/
#define UP      A1
#define RIGHT   A2
#define DOWN    A3
#define CLICK   A4
#define LEFT    A5

#define BLINK0  7
#define BLINK1  8

/* Define CAN Data Field */
#define JOY     0

#define MYCANID 0x0C

unsigned char CANDataFrame[8] = {0, 0, 0, 0, 0, 0, 0, 0};
unsigned char shieldLEDs = 0b00;

void setup()
{
  pinMode(UP,     INPUT);   //enable joystick input
  pinMode(DOWN,   INPUT);
  pinMode(LEFT,   INPUT);
  pinMode(RIGHT,  INPUT);
  pinMode(CLICK,  INPUT);

  digitalWrite(UP,    HIGH);  // set pullups on analog pins used as input
  digitalWrite(DOWN,  HIGH);  
  digitalWrite(LEFT,  HIGH);  
  digitalWrite(RIGHT, HIGH);  
  digitalWrite(CLICK, HIGH);  
  
  pinMode(BLINK0, OUTPUT); //enable LED output on shield
  pinMode(BLINK1, OUTPUT);
  
  Serial.begin(57600);      //set baud here
  Serial.println("Joystick + CAN bus demo");
  if(CAN.begin(CAN_500KBPS) == CAN_OK) 
    Serial.print("CAN Bus Init OK!\r\n");
  else 
    Serial.print("CAN failure!!!\r\n");
}


void blankshieldLEDs()
{
  shieldLEDs = 0b00;
  digitalWrite(BLINK0, LOW);
  digitalWrite(BLINK1, LOW);
}


void blinkshieldLEDs()
{
  if (shieldLEDs & 0b01)
    digitalWrite(BLINK0, HIGH);
  if (shieldLEDs & 0b10)
    digitalWrite(BLINK1, HIGH);
}


void loop() 
{
  blankshieldLEDs();
  CANDataFrame[JOY] = 0b00000; //clear the byte to send

  if (digitalRead(UP) == 0) 
  {
    Serial.println("Up pressed");
    shieldLEDs |= 0b01;             //hoping that the hardware allows diagonal input (nope)
    CANDataFrame[JOY] |= 0b00001;   //set one bit of the byte to send
  }
    
  if (digitalRead(DOWN) == 0) 
  {
    Serial.println("Down pressed");
    shieldLEDs |= 0b10;
    CANDataFrame[JOY] |= 0b00010;
  }
    
  if (digitalRead(LEFT) == 0) 
  {
    Serial.println("Left pressed");
    shieldLEDs |= 0b10;
    CANDataFrame[JOY] |= 0b00100;
  }

  if (digitalRead(RIGHT) == 0) 
  {
    Serial.println("Right pressed");
    shieldLEDs |= 0b01;
    CANDataFrame[JOY] |= 0b01000;
  }

  if (digitalRead(CLICK) == 0) {
    Serial.println("Click pressed");
    shieldLEDs = 0b11;
    CANDataFrame[JOY] |= 0b10000;
  }    

  blinkshieldLEDs();

  // format: CAN.sendMsgBuf(hex-id, frame-type, data-length, data-frame);  
  CAN.sendMsgBuf(MYCANID, 0, 8, CANDataFrame);  

  delay(100);
}