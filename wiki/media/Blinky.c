//Distributed under the GPL v 2.0
//by fenn 10/03/06
//simple test program blinks an LED on and off

#include <avr/io.h>

//for a delay of 1 second, n = about 23000
void delay(long n) 
{
	long a;
	for(a=0;a<n;a++)
	{
		//do nothing, fast!
	}
}


int main(void)
{    
	//hexadecimal 0xFF is 11111111 in binary
	DDRB=0xFF; //set port A to output
        while(1)
	{
		PORTB=0xFF; //turn the led on
		delay(2300);
		PORTB=0x00; //turn the led off
		delay(2300);
	}
}
