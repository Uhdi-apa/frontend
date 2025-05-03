"use client";
import {useState, useEffect} from "react";
import {Input} from "@heroui/input";
import {Button} from "@heroui/button";
import {useRouter} from "next/navigation";

export default function Age() {
    const router = useRouter();
    const [age, setAge] = useState("");
    const [isValid, setIsValid] = useState(false);

    // 나이 입력값 검증 및 버튼 활성화 상태 관리
    useEffect(() => {
        if (age && !isNaN(Number(age)) && Number(age) > 0 && Number(age) < 150) {
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }, [age]);

    // 다음 페이지로 이동하는 함수
    const handleNextClick = () => {
        if (isValid) {
            router.push('/symptom'); // 또는 다음 페이지 경로
        }
    };

    return (
        <>
            <div className="pt-32">
                <p className="flex font-bold text-2xl">연령을 기입해주세요.</p>
                <p className="flex font-normal text-sm pt-2">정확한 나이를 기입해야 사용자가 방문 가능한 병원을<br/>알려줄 수 있어요.</p>
            </div>
            <div className="pt-16">
                <div className="flex items-center">
                    <div className="relative flex-grow max-w-[250px]">
                        <Input
                            isRequired
                            radius="sm"
                            variant="bordered"
                            placeholder="만 나이를 입력해주세요."
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            type="number"
                            className="w-full"
                        />
                    </div>
                    <span className="font-bold text-2xl pl-5 self-center">세</span>
                </div>
            </div>
            <div className="fixed bottom-8 left-0 right-0 flex justify-center w-full px-4">
                <Button
                    className={`w-full max-w-lg ${isValid ? 'bg-primary text-white' : 'bg-[#EDEDED]'}`}
                    radius="full"
                    onPress={handleNextClick}
                    isDisabled={!isValid}
                >
                    다음
                </Button>
            </div>
        </>
    )
}