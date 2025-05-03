"use client";
import {useState, useEffect} from "react";
import {Textarea} from "@heroui/input";
import {Button} from "@heroui/button";
import {useRouter} from "next/navigation";

export default function Symptom() {
    const router = useRouter();
    const [symptom, setSymptom] = useState("");
    const [isValid, setIsValid] = useState(false);

    // 증상 입력값 검증 및 버튼 활성화 상태 관리
    useEffect(() => {
        if (symptom && symptom.trim().length > 0) {
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }, [symptom]);

    // 다음 페이지로 이동하는 함수
    const handleNextClick = () => {
        if (isValid) {
            router.push('/map'); // 다음 페이지 경로
        }
    };

    return (
        <>
            <div className="pt-32">
                <p className="flex font-bold text-2xl">증상을 기입해주세요.</p>
                <p className="flex font-normal text-sm pt-2">어떤 증상으로 아프고 어떤 과의 전문적 도움이 필요한 지 작성하면 AI가 문제를 더욱 쉽게 파악할 수
                    있어요.</p>
            </div>
            <div className="pt-14">
                <div className="flex items-center">
                    <div className="flex w-full">
                        <Textarea
                            isRequired
                            placeholder="증상을 입력해주세요."
                            variant="bordered"
                            className="w-full"
                            value={symptom}
                            onChange={(e) => setSymptom(e.target.value)}
                        />
                    </div>
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
    );
}