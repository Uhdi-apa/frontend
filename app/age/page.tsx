/* eslint-disable prettier/prettier */
"use client";
import { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { useRouter } from "next/navigation";

export default function Age() {
    const router = useRouter();
    const [age, setAge] = useState("");
    const [isValid, setIsValid] = useState(false);

    // Validate age input and manage button activation state
    useEffect(() => {
        if (age && !isNaN(Number(age)) && Number(age) > 0 && Number(age) < 150) {
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }, [age]);

    // Function to navigate to next page
    const handleNextClick = () => {
        if (isValid) {
            router.push('/symptom'); // Or next page path
        }
    };

    return (
        <>
            <div className="pt-32">
                <p className="flex font-bold text-2xl">Please enter your age.</p>
                <p className="flex font-normal text-sm pt-2">An accurate age helps us identify the appropriate hospitals you can visit.</p>
            </div>
            <div className="pt-16">
                <div className="flex items-center">
                    <div className="relative flex-grow max-w-[250px]">
                        <Input
                            isRequired
                            radius="sm"
                            variant="bordered"
                            placeholder="Enter your age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            type="number"
                            className="w-full"
                        />
                    </div>
                    <span className="font-bold text-2xl pl-5 self-center">years</span>
                </div>
            </div>
            <div className="fixed bottom-8 left-0 right-0 flex justify-center w-full px-4">
                <Button
                    className={`w-full max-w-lg ${isValid ? 'bg-primary text-white' : 'bg-[#EDEDED]'}`}
                    radius="full"
                    onPress={handleNextClick}
                    isDisabled={!isValid}
                >
                    Next
                </Button>
            </div>
        </>
    )
}